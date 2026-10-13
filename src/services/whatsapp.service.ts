import { envConfig, businessConfig } from '../config';
import { logger } from '../utils/logger';
import { dbService } from './db.service';

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

export interface OutgoingLog {
  id: string;
  to: string;
  type: 'text' | 'interactive_button' | 'interactive_list' | 'template';
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
}

export interface DetailedSendResult {
  success: boolean;
  mode: 'simulator' | 'live';
  status: 'sent' | 'simulated' | 'delivered' | 'failed';
  messageId?: string;
  error?: string;
  warning?: string;
}

export interface SendMessageOptions {
  mode?: 'simulator' | 'live';
  type: 'text' | 'template';
  text?: string;
  templateName?: string;
  languageCode?: string;
  components?: any[];
}

class WhatsAppService {
  private listeners: Array<(log: OutgoingLog) => void> = [];
  private mode: 'simulator' | 'live' = 'simulator';

  getMode(): 'simulator' | 'live' {
    return this.mode;
  }

  setMode(newMode: 'simulator' | 'live'): void {
    this.mode = newMode;
    logger.info(`WhatsApp Service dispatch mode switched to: ${newMode}`);
  }

  /**
   * Register a listener for sent messages (used by UI Simulator)
   */
  onMessageSent(fn: (log: OutgoingLog) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners(log: OutgoingLog) {
    for (const listener of this.listeners) {
      try {
        listener(log);
      } catch (err) {
        logger.error('Error in message listener', err);
      }
    }
  }

  /**
   * Dispatches message in simulated sandbox mode (for testing and when token is expired/invalid)
   */
  private async dispatchSimulated(
    to: string,
    payload: Record<string, unknown>,
    status: 'simulated' | 'sent' | 'failed' = 'simulated',
    diagnosticNote?: string
  ): Promise<boolean> {
    const logEntry: OutgoingLog = {
      id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      to,
      type: (payload.type as any) || 'text',
      payload,
      timestamp: new Date().toISOString(),
      status,
      error: diagnosticNote
    };
    this.notifyListeners(logEntry);

    // Record in database
    await dbService.recordMessage({
      sender: 'BOT',
      direction: 'OUTBOUND',
      type: String(payload.type || 'text'),
      body: this.extractSummary(payload),
      status,
      rawPayload: payload
    });

    if (diagnosticNote) {
      logger.info(`[WhatsApp Sandbox Simulated Send] to: ${to} (${diagnosticNote})`);
    } else {
      logger.info(`[WhatsApp Sandbox Simulated Send] to: ${to}, type: ${payload.type}`);
    }
    return true;
  }

  /**
   * Generic sender with exponential backoff retries and graceful sandbox fallback
   */
  private async sendPayloadWithRetry(to: string, payload: Record<string, unknown>, maxRetries = 3): Promise<boolean> {
    const { whatsappToken, phoneNumberId, metaApiVersion } = envConfig;
    const url = `https://graph.facebook.com/${metaApiVersion}/${phoneNumberId}/messages`;

    // If no token or placeholder dummy ID, dispatch directly via simulated sandbox
    const isPlaceholder =
      !whatsappToken ||
      whatsappToken.startsWith('EAAxxxx') ||
      !phoneNumberId ||
      phoneNumberId === '109876543210987';

    if (isPlaceholder) {
      return this.dispatchSimulated(to, payload, 'simulated');
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        attempt++;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let parsedError: any = null;
          try {
            parsedError = JSON.parse(errorText);
          } catch {}

          // 401 Unauthorized / Code 190 (Expired or Invalid Meta Token)
          // Do NOT retry 401 endlessly: fall back to simulated sandbox mode so conversations aren't blocked
          if (response.status === 401 || parsedError?.error?.code === 190) {
            logger.warn(
              `[WhatsApp API 401] WHATSAPP_TOKEN is expired or invalid (Code 190). Falling back to sandbox simulation for ${to}.`
            );
            return this.dispatchSimulated(
              to,
              payload,
              'simulated',
              'Meta Token Expired (401). Delivered via sandbox simulation.'
            );
          }

          // 400 / 403 (e.g. Recipient phone number not added to allowed sandbox test list)
          if (response.status === 400 || response.status === 403) {
            logger.warn(
              `[WhatsApp API ${response.status}] Recipient or payload rejected by Meta Cloud API: ${errorText}. Falling back to sandbox simulation.`
            );
            return this.dispatchSimulated(
              to,
              payload,
              'simulated',
              `Meta Cloud API (${response.status}): ${parsedError?.error?.message || errorText}`
            );
          }

          throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        logger.info(`[WhatsApp API Live Success] message sent to ${to}`, data);

        const logEntry: OutgoingLog = {
          id: `out-${Date.now()}`,
          to,
          type: (payload.type as any) || 'text',
          payload,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        this.notifyListeners(logEntry);

        await dbService.recordMessage({
          sender: 'BOT',
          direction: 'OUTBOUND',
          type: String(payload.type || 'text'),
          body: this.extractSummary(payload),
          status: 'sent',
          rawPayload: payload
        });

        return true;
      } catch (err: any) {
        logger.warn(`Send attempt ${attempt} failed for ${to}: ${err.message}`);
        if (attempt >= maxRetries) {
          logger.warn(`Retries exhausted for ${to}. Delivering via sandbox simulation fallback.`);
          return this.dispatchSimulated(to, payload, 'simulated', `Live send failed (${err.message}). Delivered via simulation.`);
        }
        // Exponential backoff for network/transient 5xx errors: 1s, 2s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    return false;
  }

  private extractSummary(payload: Record<string, unknown>): string {
    if (payload.text && typeof payload.text === 'object' && 'body' in (payload.text as any)) {
      return (payload.text as any).body;
    }
    if (payload.interactive && typeof payload.interactive === 'object') {
      const interactive = payload.interactive as any;
      return interactive.body?.text || `Interactive ${interactive.type}`;
    }
    if (payload.template && typeof payload.template === 'object') {
      return `Template: ${(payload.template as any).name}`;
    }
    return JSON.stringify(payload);
  }

  /**
   * Send a standard plain or formatted text message
   */
  async sendText(to: string, text: string): Promise<boolean> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };
    return this.sendPayloadWithRetry(to, payload);
  }

  /**
   * Send WhatsApp Interactive Reply Buttons (max 3 buttons)
   */
  async sendReplyButtons(to: string, bodyText: string, buttons: WhatsAppButton[], headerText?: string): Promise<boolean> {
    // Meta Cloud API enforces maximum 3 reply buttons
    const validButtons = buttons.slice(0, 3).map((btn) => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.slice(0, 20) // Meta max 20 chars
      }
    }));

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: validButtons
        }
      }
    };

    if (headerText) {
      (payload.interactive as any).header = {
        type: 'text',
        text: headerText
      };
    }

    return this.sendPayloadWithRetry(to, payload);
  }

  /**
   * Send WhatsApp Interactive List message (max 10 rows across sections)
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: WhatsAppListSection[],
    headerText?: string
  ): Promise<boolean> {
    // Meta requires max 10 rows total
    let totalRows = 0;
    const truncatedSections: WhatsAppListSection[] = [];

    for (const sec of sections) {
      const remaining = 10 - totalRows;
      if (remaining <= 0) break;
      const validRows = sec.rows.slice(0, remaining).map((r) => ({
        id: r.id,
        title: r.title.slice(0, 24),
        description: r.description ? r.description.slice(0, 72) : undefined
      }));
      totalRows += validRows.length;
      truncatedSections.push({
        title: sec.title.slice(0, 24),
        rows: validRows
      });
    }

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText.slice(0, 20),
          sections: truncatedSections
        }
      }
    };

    if (headerText) {
      (payload.interactive as any).header = {
        type: 'text',
        text: headerText
      };
    }

    return this.sendPayloadWithRetry(to, payload);
  }

  /**
   * Send WhatsApp Template message (required outside the 24-hour service window)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    components?: any[]
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {})
      }
    };
    return this.sendPayloadWithRetry(to, payload);
  }

  /**
   * Send a WhatsApp message with explicit mode (Live WhatsApp API vs Simulator)
   * Handles both Template and Free Text messages, and catches Meta errors (e.g. #131030 recipient not in sandbox list).
   */
  async sendMessage(to: string, options: SendMessageOptions): Promise<DetailedSendResult> {
    const targetMode = options.mode || this.mode;

    // Construct the WhatsApp payload
    let payload: Record<string, unknown>;
    if (options.type === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: options.templateName,
          language: { code: options.languageCode || 'en_US' },
          ...(options.components && options.components.length > 0 ? { components: options.components } : {})
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: options.text || ''
        }
      };
    }

    // 1. Simulator Mode: No external API call
    if (targetMode === 'simulator') {
      const summary = options.type === 'template' ? `[Template: ${options.templateName}]` : options.text || '';
      const simulatedMsg = await dbService.recordMessage({
        sender: 'OWNER',
        direction: 'OUTBOUND',
        type: options.type,
        body: summary,
        status: 'simulated',
        rawPayload: payload
      });

      const logEntry: OutgoingLog = {
        id: simulatedMsg.id,
        to,
        type: options.type === 'template' ? 'template' : 'text',
        payload,
        timestamp: new Date().toISOString(),
        status: 'simulated'
      };
      this.notifyListeners(logEntry);

      return {
        success: true,
        mode: 'simulator',
        status: 'simulated',
        messageId: simulatedMsg.id
      };
    }

    // 2. Live WhatsApp Cloud API Mode
    const { whatsappToken, phoneNumberId, metaApiVersion } = envConfig;
    if (!whatsappToken || !phoneNumberId || whatsappToken.startsWith('EAAxxxx')) {
      return {
        success: false,
        mode: 'live',
        status: 'failed',
        error: 'Meta Cloud API credentials are not configured. Please add WHATSAPP_TOKEN and PHONE_NUMBER_ID in .env or Settings.'
      };
    }

    const url = `https://graph.facebook.com/${metaApiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {}

      if (!response.ok) {
        let userFriendlyError = `Meta API Error (${response.status}): ${parsed?.error?.message || responseText}`;
        const errorCode = parsed?.error?.code;

        // Detect Meta error #131030 (Recipient phone number not in allowed list for free test number)
        if (errorCode === 131030 || responseText.includes('131030') || responseText.includes('allowed list')) {
          userFriendlyError = `Recipient (+${to}) is not in your Meta test number allowed list. Add this number under Meta > WhatsApp > API Setup > To.`;
        } else if (response.status === 401 || errorCode === 190) {
          userFriendlyError = `Authentication Error: WHATSAPP_TOKEN is invalid or expired. Update token in Settings or .env.`;
        }

        // Record failed message in database
        await dbService.recordMessage({
          sender: 'OWNER',
          direction: 'OUTBOUND',
          type: options.type,
          body: options.type === 'template' ? `[Template: ${options.templateName}]` : options.text || '',
          status: 'failed',
          errorMessage: userFriendlyError,
          rawPayload: payload
        });

        logger.error(`Live WhatsApp send failed to ${to}`, undefined, { error: userFriendlyError, raw: parsed });

        return {
          success: false,
          mode: 'live',
          status: 'failed',
          error: userFriendlyError
        };
      }

      // Success
      const messageId = parsed?.messages?.[0]?.id || `wamid.LIVE_${Date.now()}`;
      await dbService.recordMessage({
        messageId,
        sender: 'OWNER',
        direction: 'OUTBOUND',
        type: options.type,
        body: options.type === 'template' ? `[Template: ${options.templateName}]` : options.text || '',
        status: 'sent',
        rawPayload: payload
      });

      const logEntry: OutgoingLog = {
        id: messageId,
        to,
        type: options.type === 'template' ? 'template' : 'text',
        payload,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      this.notifyListeners(logEntry);

      logger.info(`Live WhatsApp message sent successfully to ${to} (${messageId})`);

      return {
        success: true,
        mode: 'live',
        status: 'sent',
        messageId
      };
    } catch (err: any) {
      logger.error(`Live WhatsApp network error to ${to}`, err);
      return {
        success: false,
        mode: 'live',
        status: 'failed',
        error: `Network error connecting to Meta Graph API: ${err.message}`
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
