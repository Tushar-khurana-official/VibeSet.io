import { dbService, CustomerModel } from './db.service';
import { whatsappService } from './whatsapp.service';
import { logger } from '../utils/logger';

export interface BroadcastRecipientResult {
  phone: string;
  name: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  timestamp: string;
}

export interface BroadcastResult {
  id: string;
  templateName: string;
  totalTargeted: number;
  sentCount: number;
  skippedUnsubscribed: number;
  failedCount: number;
  mode: 'simulator' | 'live';
  timestamp: string;
  recipients: BroadcastRecipientResult[];
}

export interface BroadcastProgress {
  isRunning: boolean;
  current: number;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

class BroadcastService {
  private isBroadcasting = false;
  private currentProgress: BroadcastProgress = {
    isRunning: false,
    current: 0,
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0
  };

  private history: BroadcastResult[] = [
    {
      id: "bc-init-1",
      templateName: "weekend_special_offer",
      totalTargeted: 1,
      sentCount: 1,
      skippedUnsubscribed: 0,
      failedCount: 0,
      mode: 'simulator',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      recipients: [
        {
          phone: "919876543210",
          name: "Tushar K",
          status: 'sent',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ]
    }
  ];

  getBroadcastHistory(): BroadcastResult[] {
    return [...this.history].reverse();
  }

  getProgress(): BroadcastProgress {
    return { ...this.currentProgress };
  }

  async sendBroadcast(params: {
    templateName: string;
    language?: string;
    delayMs?: number;
    filterSource?: 'all' | 'csv' | 'consent_after';
    consentAfterDate?: string;
    languageFilter?: 'all' | 'en' | 'hi';
    variables?: string[];
    mode?: 'simulator' | 'live';
  }): Promise<BroadcastResult> {
    if (this.isBroadcasting) {
      throw new Error('A broadcast campaign is already currently running.');
    }

    this.isBroadcasting = true;
    const delay = Math.max(100, params.delayMs || 500); // rate limiting delay between sends
    const allCustomers = await dbService.listCustomers();
    const effectiveMode = params.mode || whatsappService.getMode();

    // 1. Filter customers according to broadcast targeting options
    const filteredCustomers = allCustomers.filter((customer) => {
      // Must be opted in
      if (!customer.optedIn) return false;

      // Filter by source
      if (params.filterSource === 'csv') {
        if (customer.source !== 'CSV') return false;
      } else if (params.filterSource === 'consent_after' && params.consentAfterDate) {
        const consentTime = customer.consentAt ? new Date(customer.consentAt).getTime() : 0;
        const cutoffTime = new Date(params.consentAfterDate).getTime();
        if (consentTime < cutoffTime) return false;
      }

      // Filter by language
      if (params.languageFilter && params.languageFilter !== 'all') {
        if (customer.language !== params.languageFilter) return false;
      }

      return true;
    });

    const recipientResults: BroadcastRecipientResult[] = [];
    let sentCount = 0;
    let skippedUnsubscribed = 0;
    let failedCount = 0;

    this.currentProgress = {
      isRunning: true,
      current: 0,
      total: filteredCustomers.length,
      sent: 0,
      failed: 0,
      skipped: 0
    };

    try {
      for (let i = 0; i < filteredCustomers.length; i++) {
        const customer = filteredCustomers[i];
        this.currentProgress.current = i + 1;

        // Extra safeguard: never message unsubscribed users
        if (!customer.optedIn) {
          skippedUnsubscribed++;
          this.currentProgress.skipped++;
          recipientResults.push({
            phone: customer.phone,
            name: customer.name || 'Customer',
            status: 'skipped',
            error: 'Customer opted out (STOP)',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        try {
          // Format template variables if provided
          let components: any[] | undefined = undefined;
          if (params.variables && params.variables.length > 0) {
            components = [
              {
                type: 'body',
                parameters: params.variables.map((v) => ({
                  type: 'text',
                  text: v.replace('{{name}}', customer.name || 'Valued Customer')
                }))
              }
            ];
          }

          const sendResult = await whatsappService.sendMessage(customer.phone, {
            mode: effectiveMode,
            type: 'template',
            templateName: params.templateName,
            languageCode: params.language || (customer.language === 'hi' ? 'hi' : 'en_US'),
            components
          });

          if (sendResult.success) {
            sentCount++;
            this.currentProgress.sent++;
            recipientResults.push({
              phone: customer.phone,
              name: customer.name || 'Customer',
              status: 'sent',
              timestamp: new Date().toISOString()
            });
          } else {
            failedCount++;
            this.currentProgress.failed++;
            recipientResults.push({
              phone: customer.phone,
              name: customer.name || 'Customer',
              status: 'failed',
              error: sendResult.error || 'Failed to dispatch via Meta API',
              timestamp: new Date().toISOString()
            });
          }

          // Rate-limiting delay between sends
          if (i < filteredCustomers.length - 1) {
            await new Promise((res) => setTimeout(res, delay));
          }
        } catch (err: any) {
          logger.error(`Broadcast failed for customer ${customer.phone}`, err);
          failedCount++;
          this.currentProgress.failed++;
          recipientResults.push({
            phone: customer.phone,
            name: customer.name || 'Customer',
            status: 'failed',
            error: err.message || 'Unknown send error',
            timestamp: new Date().toISOString()
          });
        }
      }

      logger.info(`Broadcast completed: ${sentCount} sent, ${skippedUnsubscribed} skipped, ${failedCount} failed`);

      const result: BroadcastResult = {
        id: `bc-${Date.now()}`,
        templateName: params.templateName,
        totalTargeted: filteredCustomers.length,
        sentCount,
        skippedUnsubscribed,
        failedCount,
        mode: effectiveMode,
        timestamp: new Date().toISOString(),
        recipients: recipientResults
      };

      this.history.push(result);
      return result;
    } finally {
      this.isBroadcasting = false;
      this.currentProgress.isRunning = false;
    }
  }
}

export const broadcastService = new BroadcastService();
