import { Request, Response } from 'express';
import { envConfig } from '../config';
import { dbService } from '../services/db.service';
import { messageHandler, IncomingWhatsAppMessage } from './message.handler';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * GET /webhook
   * Meta Webhook verification handshake
   */
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Meta Webhook verification requested', { mode, tokenReceived: token ? 'yes' : 'no' });

    if (mode === 'subscribe' && token === envConfig.verifyToken) {
      logger.info('Webhook verification SUCCESS: Token matched.');
      res.status(200).send(challenge);
      return;
    }

    logger.warn('Webhook verification FAILED: Token mismatch or invalid mode.');
    res.status(403).send('Forbidden: Verification token mismatch');
  }

  /**
   * POST /webhook
   * Receives incoming messages from Meta WhatsApp Cloud API
   * Immediately returns 200, handles idempotency, processes asynchronously
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const body = req.body;

    // Immediately ACK with HTTP 200 to satisfy Meta's strict timeout SLA
    res.status(200).send('EVENT_RECEIVED');

    // Run processing asynchronously
    (async () => {
      try {
        if (!body || body.object !== 'whatsapp_business_account') {
          return;
        }

        const entries = body.entry;
        if (!Array.isArray(entries)) return;

        for (const entry of entries) {
          const changes = entry.changes;
          if (!Array.isArray(changes)) continue;

          for (const change of changes) {
            const value = change.value;
            if (!value || value.messaging_product !== 'whatsapp') continue;

            const messages = value.messages;
            const contacts = value.contacts;
            const senderName = Array.isArray(contacts) && contacts[0]?.profile?.name ? contacts[0].profile.name : undefined;

            if (!Array.isArray(messages)) continue;

            for (const msg of messages) {
              const messageId = msg.id;

              // Check idempotency (ignore duplicate message IDs)
              if (messageId && dbService.isMessageProcessed(messageId)) {
                logger.info(`Ignored duplicate message ID: ${messageId}`);
                continue;
              }

              if (messageId) {
                dbService.markMessageProcessed(messageId);
              }

              // Record in message history
              await dbService.recordMessage({
                messageId,
                sender: msg.from,
                direction: 'INBOUND',
                type: msg.type || 'text',
                body: msg.text?.body || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '',
                rawPayload: msg
              });

              // Process message via state machine handler
              await messageHandler.handleIncomingMessage(
                {
                  from: msg.from,
                  id: msg.id,
                  timestamp: msg.timestamp,
                  type: msg.type,
                  text: msg.text,
                  interactive: msg.interactive
                },
                senderName
              );
            }
          }
        }
      } catch (err) {
        logger.error('Error asynchronously processing WhatsApp webhook payload', err);
      }
    })();
  }
}

export const webhookController = new WebhookController();
