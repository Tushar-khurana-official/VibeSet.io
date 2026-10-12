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

class WhatsAppService {
  private listeners: Array<(log: OutgoingLog) => void> = [];

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
   * Generic sender with exponential backoff retries
   */
  private async sendPayloadWithRetry(to: string, payload: Record<string, unknown>, maxRetries = 3): Promise<boolean> {
    const { whatsappToken, phoneNumberId, metaApiVersion } = envConfig;
    const url = `https://graph.facebook.com/${metaApiVersion}/${phoneNumberId}/messages`;

    // If no token or simulated phone number, log and emit simulated delivery
    if (!whatsappToken || whatsappToken.startsWith('EAAxxxx') || !phoneNumberId) {
      const logEntry: OutgoingLog = {
        id: `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        to,
        type: (payload.type as any) || 'text',
        payload,
        timestamp: new Date().toISOString(),
        status: 'simulated'
      };
      this.notifyListeners(logEntry);

      // Record in database
      await dbService.recordMessage({
        sender: 'BOT',
        direction: 'OUTBOUND',
        type: String(payload.type || 'text'),
        body: this.extractSummary(payload),
        rawPayload: payload
      });

      logger.info(`[WhatsApp Simulated Send] to: ${to}, type: ${payload.type}`);
      return true;
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
          throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        logger.info(`[WhatsApp API Success] message sent to ${to}`, data);

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
          rawPayload: payload
        });

        return true;
      } catch (err: any) {
        logger.warn(`Send attempt ${attempt} failed for ${to}: ${err.message}`);
        if (attempt >= maxRetries) {
          logger.error(`Exceeded maximum retries (${maxRetries}) for ${to}`, err);
          const failEntry: OutgoingLog = {
            id: `out-fail-${Date.now()}`,
            to,
            type: (payload.type as any) || 'text',
            payload,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: err.message
          };
          this.notifyListeners(failEntry);
          return false;
        }
        // Exponential backoff: 1s, 2s, 4s...
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
}

export const whatsappService = new WhatsAppService();
