import { businessConfig, envConfig } from '../config';
import { dbService, OrderModel, OrderStatus } from './db.service';
import { whatsappService } from './whatsapp.service';
import { t } from '../locales';
import { logger } from '../utils/logger';

class OrderService {
  /**
   * Finalize and create an order, send customer confirmation, and alert owner.
   */
  async placeOrder(params: {
    customerPhone: string;
    customerName?: string;
    item: { id: string; title: string; price: number };
    quantity: number;
    deliveryAddress: string;
    notes?: string;
  }): Promise<OrderModel> {
    const customer = await dbService.upsertCustomer(params.customerPhone, params.customerName);
    const lang = customer.language || 'en';
    const totalAmount = params.item.price * params.quantity;

    const order = await dbService.createOrder({
      customerId: customer.id,
      customerPhone: customer.phone,
      customerName: customer.name || undefined,
      items: [
        {
          itemId: params.item.id,
          itemName: params.item.title,
          price: params.item.price,
          quantity: params.quantity
        }
      ],
      totalAmount,
      deliveryAddress: params.deliveryAddress,
      notes: params.notes
    });

    // 1. Send customer confirmation message on WhatsApp
    const successMessage = t('order_success', lang, {
      orderNumber: order.orderNumber,
      total: order.totalAmount,
      currency: businessConfig.currency
    });
    await whatsappService.sendText(params.customerPhone, successMessage);

    // 2. Alert business owner via WhatsApp
    if (envConfig.ownerPhone) {
      const ownerAlert = t('owner_notification', 'en', {
        orderNumber: order.orderNumber,
        customerPhone: params.customerPhone,
        itemName: params.item.title,
        quantity: params.quantity,
        total: order.totalAmount,
        currency: businessConfig.currency,
        address: params.deliveryAddress,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
      await whatsappService.sendText(envConfig.ownerPhone, ownerAlert);
      logger.info(`Owner WhatsApp notification dispatched to ${envConfig.ownerPhone} for order ${order.orderNumber}`);
    }

    return order;
  }

  /**
   * Admin updates order status (PLACED, PREPARING, READY, DELIVERED, CANCELLED)
   * Dispatches WhatsApp update message to the customer.
   */
  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<OrderModel | null> {
    const order = await dbService.getOrderById(orderId);
    if (!order) return null;

    const updated = await dbService.updateOrderStatus(orderId, newStatus);
    if (!updated) return null;

    if (order.customerPhone) {
      const customer = await dbService.findCustomerByPhone(order.customerPhone);
      const lang = customer?.language || 'en';

      // Check 24h window
      const orderAgeHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);

      if (orderAgeHours <= 24) {
        // Inside 24-hour window: Free-form session message
        const messageText = t('status_update_notification', lang, {
          orderNumber: order.orderNumber,
          status: newStatus
        });
        await whatsappService.sendText(order.customerPhone, messageText);
      } else {
        // Outside 24-hour window: Meta requires WhatsApp Template message
        logger.info(`Customer ${order.customerPhone} is outside 24h window. Sending order_status_update template.`);
        await whatsappService.sendTemplate(
          order.customerPhone,
          'order_status_update',
          lang === 'hi' ? 'hi' : 'en_US',
          [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: order.orderNumber },
                { type: 'text', text: newStatus }
              ]
            }
          ]
        );
      }
    }

    return updated;
  }
}

export const orderService = new OrderService();
