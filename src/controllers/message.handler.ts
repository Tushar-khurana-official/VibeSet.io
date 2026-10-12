import { businessConfig } from '../config';
import { dbService } from '../services/db.service';
import { stateService } from '../services/state.service';
import { whatsappService, WhatsAppListSection } from '../services/whatsapp.service';
import { orderService } from '../services/order.service';
import { t } from '../locales';
import { logger } from '../utils/logger';

export interface IncomingWhatsAppMessage {
  from: string; // sender phone, e.g., '919876543210'
  id: string; // Meta message ID, e.g., 'wamid.HBg...'
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'unknown';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export class MessageHandler {
  /**
   * Main dispatch entry point for processing an incoming WhatsApp message
   */
  async handleIncomingMessage(msg: IncomingWhatsAppMessage, senderName?: string): Promise<void> {
    const phone = msg.from;
    const customer = await dbService.upsertCustomer(phone, senderName);
    let lang = customer.language || 'en';

    // Extract text content or interactive selection ID
    let textBody = '';
    let actionId = '';

    if (msg.type === 'text' && msg.text?.body) {
      textBody = msg.text.body.trim();
    } else if (msg.type === 'interactive' && msg.interactive) {
      if (msg.interactive.type === 'button_reply' && msg.interactive.button_reply) {
        actionId = msg.interactive.button_reply.id;
        textBody = msg.interactive.button_reply.title;
      } else if (msg.interactive.type === 'list_reply' && msg.interactive.list_reply) {
        actionId = msg.interactive.list_reply.id;
        textBody = msg.interactive.list_reply.title;
      }
    }

    const normalizedText = textBody.toLowerCase().trim();

    logger.info(`Received WhatsApp message from ${phone}`, { text: textBody, actionId });

    // 1. Opt-out check ("STOP" / "UNSUBSCRIBE")
    if (normalizedText === 'stop' || normalizedText === 'unsubscribe') {
      await dbService.setCustomerOptIn(phone, false);
      await stateService.resetState(phone);
      await whatsappService.sendText(phone, t('opt_out_success', lang));
      return;
    }

    // 2. Opt-in check ("START" / "SUBSCRIBE")
    if (normalizedText === 'start' || normalizedText === 'subscribe') {
      await dbService.setCustomerOptIn(phone, true);
      await whatsappService.sendText(phone, t('opt_in_success', lang));
      await this.sendMainMenu(phone, lang);
      return;
    }

    // If user is unsubscribed, ignore any other message per Meta policy
    if (!customer.optedIn) {
      logger.info(`Ignored message from opted-out customer ${phone}`);
      return;
    }

    // 3. Human Handoff Check
    const conversation = await dbService.getConversation(customer.id);
    if (conversation?.isBotPaused) {
      if (normalizedText === 'bot' || normalizedText === 'restart') {
        // Customer manually requests bot back
        await dbService.setBotPaused(customer.id, false);
        await whatsappService.sendText(phone, t('agent_handoff_resumed', lang));
        await this.sendMainMenu(phone, lang);
      } else {
        logger.info(`Bot is paused for customer ${phone} (human handoff active). Message logged.`);
      }
      return;
    }

    // 4. Human Handoff Request ("agent", "human", "support")
    if (normalizedText === 'agent' || actionId === 'action_agent') {
      await dbService.setBotPaused(customer.id, true);
      await whatsappService.sendText(phone, t('agent_handoff_started', lang));
      logger.info(`Human handoff initiated for ${phone}`);
      return;
    }

    // 5. Global Cancel / Reset
    if (normalizedText === 'cancel' || actionId === 'action_cancel') {
      await stateService.resetState(phone);
      await whatsappService.sendText(phone, t('order_cancelled', lang));
      await this.sendMainMenu(phone, lang);
      return;
    }

    // 6. Global Back Navigation
    if (normalizedText === 'back' || actionId === 'action_back') {
      const targetState = await stateService.handleBack(phone);
      await this.renderState(phone, targetState, lang);
      return;
    }

    // 7. Language Switch Request
    if (actionId === 'action_change_lang' || normalizedText === 'language' || normalizedText === 'भाषा') {
      await whatsappService.sendReplyButtons(
        phone,
        lang === 'hi' ? 'कृपया अपनी पसंदीदा भाषा चुनें:' : 'Please choose your preferred language:',
        [
          { id: 'set_lang_en', title: 'English' },
          { id: 'set_lang_hi', title: 'हिंदी (Hindi)' }
        ]
      );
      return;
    }

    if (actionId === 'set_lang_en') {
      await dbService.updateCustomerLanguage(phone, 'en');
      lang = 'en';
      await whatsappService.sendText(phone, t('lang_changed', 'en'));
      await this.sendMainMenu(phone, 'en');
      return;
    }

    if (actionId === 'set_lang_hi') {
      await dbService.updateCustomerLanguage(phone, 'hi');
      lang = 'hi';
      await whatsappService.sendText(phone, t('lang_changed', 'hi'));
      await this.sendMainMenu(phone, 'hi');
      return;
    }

    // 8. Hours & Location
    if (actionId === 'action_hours_location' || normalizedText === 'hours' || normalizedText === 'location') {
      await whatsappService.sendText(phone, t('hours_info', lang));
      return;
    }

    // 9. Track Order
    if (actionId === 'action_track_order' || normalizedText === 'status' || normalizedText === 'track') {
      const latestOrder = await dbService.getLatestOrderByPhone(phone);
      if (!latestOrder) {
        await whatsappService.sendText(phone, t('no_active_orders', lang));
      } else {
        const statusMsg = t('order_status_result', lang, {
          orderNumber: latestOrder.orderNumber,
          status: latestOrder.status,
          placedAt: new Date(latestOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          address: latestOrder.deliveryAddress,
          total: latestOrder.totalAmount,
          currency: businessConfig.currency
        });
        await whatsappService.sendText(phone, statusMsg);
      }
      return;
    }

    // 10. Check 24-hour Inactivity / First Contact Welcome
    const lastInteraction = conversation ? new Date(conversation.lastInteraction).getTime() : 0;
    const hoursSinceLast = (Date.now() - lastInteraction) / (1000 * 60 * 60);

    if (!conversation || hoursSinceLast >= 24) {
      const welcomeKey = !conversation ? 'welcome_new' : 'welcome_returning';
      await whatsappService.sendText(phone, t(welcomeKey, lang));
      await dbService.upsertConversation(customer.id, 'MAIN_MENU');
      await this.sendMainMenu(phone, lang);
      return;
    }

    // Update conversation timestamp
    await dbService.upsertConversation(customer.id, 'MAIN_MENU');

    // 11. Keywords: hi, hello, menu, help
    if (['hi', 'hello', 'hey', 'start', 'menu', 'help'].includes(normalizedText) || actionId === 'action_menu') {
      await stateService.resetState(phone);
      await this.sendMainMenu(phone, lang);
      return;
    }

    // 12. State Machine Transitions
    const currentState = await stateService.getState(phone);

    switch (currentState.state) {
      case 'MAIN_MENU':
        if (actionId === 'action_order_now' || normalizedText === 'order' || normalizedText === 'order now') {
          await stateService.setState(phone, 'BROWSING');
          await this.sendCatalogList(phone, lang);
        } else {
          await this.sendMainMenu(phone, lang);
        }
        break;

      case 'BROWSING':
        // User clicked on a menu dish row or typed dish ID/name
        const selectedDish = this.findDishByActionOrText(actionId, textBody);
        if (selectedDish) {
          await stateService.setState(phone, 'QUANTITY', {
            draftItem: {
              id: selectedDish.id,
              title: selectedDish.title,
              price: selectedDish.price
            }
          });
          const qtyText = t('select_quantity', lang, {
            itemName: selectedDish.title,
            price: selectedDish.price,
            currency: businessConfig.currency
          });
          await whatsappService.sendReplyButtons(phone, qtyText, [
            { id: 'qty_1', title: '1' },
            { id: 'qty_2', title: '2' },
            { id: 'qty_3', title: '3' }
          ]);
        } else {
          // If unrecognised, resend catalog
          await whatsappService.sendText(phone, t('fallback_message', lang));
          await this.sendCatalogList(phone, lang);
        }
        break;

      case 'QUANTITY':
        let quantity = 1;
        if (actionId.startsWith('qty_')) {
          quantity = parseInt(actionId.replace('qty_', ''), 10) || 1;
        } else {
          const parsed = parseInt(textBody, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
            quantity = parsed;
          }
        }

        if (currentState.draftItem) {
          const total = currentState.draftItem.price * quantity;
          await stateService.setState(phone, 'ADDRESS', { draftQuantity: quantity });
          const addressPrompt = t('ask_address', lang, {
            quantity,
            itemName: currentState.draftItem.title,
            total,
            currency: businessConfig.currency
          });
          await whatsappService.sendText(phone, addressPrompt);
        } else {
          await stateService.resetState(phone);
          await this.sendMainMenu(phone, lang);
        }
        break;

      case 'ADDRESS':
        if (textBody.length >= 3) {
          await stateService.setState(phone, 'CONFIRM', { draftAddress: textBody });
          if (currentState.draftItem && currentState.draftQuantity) {
            const total = currentState.draftItem.price * currentState.draftQuantity;
            const confirmPrompt = t('order_confirmation_prompt', lang, {
              itemName: currentState.draftItem.title,
              quantity: currentState.draftQuantity,
              total,
              currency: businessConfig.currency,
              address: textBody
            });
            await whatsappService.sendReplyButtons(phone, confirmPrompt, [
              { id: 'confirm_order_yes', title: t('btn_confirm_order', lang) },
              { id: 'confirm_order_no', title: t('btn_cancel_order', lang) }
            ]);
          }
        } else {
          await whatsappService.sendText(
            phone,
            lang === 'hi'
              ? 'कृपया पूरा डिलीवरी पता दर्ज करें (कम से कम 5 अक्षर):'
              : 'Please enter a complete delivery address (at least 5 characters):'
          );
        }
        break;

      case 'CONFIRM':
        if (actionId === 'confirm_order_yes' || normalizedText === 'yes' || normalizedText === 'confirm') {
          if (currentState.draftItem && currentState.draftQuantity && currentState.draftAddress) {
            await orderService.placeOrder({
              customerPhone: phone,
              customerName: customer.name || undefined,
              item: currentState.draftItem,
              quantity: currentState.draftQuantity,
              deliveryAddress: currentState.draftAddress
            });
            await stateService.resetState(phone);
          }
        } else if (actionId === 'confirm_order_no' || normalizedText === 'no' || normalizedText === 'cancel') {
          await stateService.resetState(phone);
          await whatsappService.sendText(phone, t('order_cancelled', lang));
          await this.sendMainMenu(phone, lang);
        } else {
          await whatsappService.sendReplyButtons(
            phone,
            t('fallback_message', lang),
            [
              { id: 'confirm_order_yes', title: t('btn_confirm_order', lang) },
              { id: 'confirm_order_no', title: t('btn_cancel_order', lang) }
            ]
          );
        }
        break;

      default:
        // Friendly Fallback
        await whatsappService.sendText(phone, t('fallback_message', lang));
        await this.sendMainMenu(phone, lang);
        break;
    }
  }

  /**
   * Helper to send Interactive Main Menu as a List Message
   */
  private async sendMainMenu(phone: string, lang: 'en' | 'hi' = 'en'): Promise<void> {
    const sections: WhatsAppListSection[] = [
      {
        title: lang === 'hi' ? 'सेवाएं और ऑर्डर' : 'Services & Orders',
        rows: [
          {
            id: 'action_order_now',
            title: t('action_order_now', lang),
            description: t('action_order_now_desc', lang)
          },
          {
            id: 'action_track_order',
            title: t('action_track_order', lang),
            description: t('action_track_order_desc', lang)
          },
          {
            id: 'action_hours_location',
            title: t('action_hours_location', lang),
            description: t('action_hours_location_desc', lang)
          }
        ]
      },
      {
        title: lang === 'hi' ? 'सहायता और सेटिंग्स' : 'Support & Settings',
        rows: [
          {
            id: 'action_agent',
            title: t('action_agent', lang),
            description: t('action_agent_desc', lang)
          },
          {
            id: 'action_change_lang',
            title: t('action_change_lang', lang),
            description: t('action_change_lang_desc', lang)
          }
        ]
      }
    ];

    await whatsappService.sendListMessage(
      phone,
      t('main_menu_body', lang),
      t('main_menu_button', lang),
      sections,
      t('main_menu_header', lang)
    );
  }

  /**
   * Helper to send dishes catalog list (max 10 items)
   */
  private async sendCatalogList(phone: string, lang: 'en' | 'hi' = 'en'): Promise<void> {
    // Group menu items by category
    const categories = Array.from(new Set(businessConfig.menuItems.map((m) => m.category)));
    const sections: WhatsAppListSection[] = categories.map((cat) => ({
      title: cat,
      rows: businessConfig.menuItems
        .filter((m) => m.category === cat)
        .slice(0, 10)
        .map((dish) => ({
          id: `item_${dish.id}`,
          title: `${dish.title} (${businessConfig.currency}${dish.price})`,
          description: dish.description
        }))
    }));

    await whatsappService.sendListMessage(
      phone,
      t('catalog_body', lang),
      t('catalog_button', lang),
      sections,
      t('catalog_header', lang)
    );
  }

  private findDishByActionOrText(actionId: string, text: string) {
    if (actionId.startsWith('item_')) {
      const id = actionId.replace('item_', '');
      return businessConfig.menuItems.find((m) => m.id === id);
    }
    const normalized = text.toLowerCase();
    return businessConfig.menuItems.find(
      (m) => m.title.toLowerCase().includes(normalized) || m.id.toLowerCase() === normalized
    );
  }

  private async renderState(phone: string, state: string, lang: 'en' | 'hi'): Promise<void> {
    switch (state) {
      case 'MAIN_MENU':
        await this.sendMainMenu(phone, lang);
        break;
      case 'BROWSING':
        await this.sendCatalogList(phone, lang);
        break;
      default:
        await this.sendMainMenu(phone, lang);
        break;
    }
  }
}

export const messageHandler = new MessageHandler();
