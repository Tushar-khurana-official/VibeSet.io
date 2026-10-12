import { dbService } from './db.service';
import { whatsappService } from './whatsapp.service';
import { logger } from '../utils/logger';

export interface BroadcastResult {
  totalTargeted: number;
  sentCount: number;
  skippedUnsubscribed: number;
  failedCount: number;
  timestamp: string;
}

class BroadcastService {
  private isBroadcasting = false;

  async sendBroadcast(params: {
    templateName: string;
    language?: string;
    delayMs?: number;
  }): Promise<BroadcastResult> {
    if (this.isBroadcasting) {
      throw new Error('A broadcast campaign is already currently running.');
    }

    this.isBroadcasting = true;
    const delay = params.delayMs || 600; // 600ms delay between sends for rate limiting
    const customers = await dbService.listCustomers();

    let sentCount = 0;
    let skippedUnsubscribed = 0;
    let failedCount = 0;

    try {
      for (const customer of customers) {
        // Enforce opt-in rule: NEVER message unsubscribed users
        if (!customer.optedIn) {
          skippedUnsubscribed++;
          continue;
        }

        try {
          // Send WhatsApp template message
          await whatsappService.sendTemplate(
            customer.phone,
            params.templateName,
            params.language || (customer.language === 'hi' ? 'hi' : 'en_US')
          );
          sentCount++;
          // Rate-limiting delay between sends
          await new Promise((res) => setTimeout(res, delay));
        } catch (err) {
          logger.error(`Broadcast failed for customer ${customer.phone}`, err);
          failedCount++;
        }
      }

      logger.info(`Broadcast completed: ${sentCount} sent, ${skippedUnsubscribed} skipped, ${failedCount} failed`);

      return {
        totalTargeted: customers.length,
        sentCount,
        skippedUnsubscribed,
        failedCount,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.isBroadcasting = false;
    }
  }
}

export const broadcastService = new BroadcastService();
