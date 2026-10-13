import { Request, Response } from 'express';
import { dbService, OrderStatus } from '../services/db.service';
import { orderService } from '../services/order.service';
import { broadcastService } from '../services/broadcast.service';
import { businessConfig, envConfig } from '../config';
import { logger } from '../utils/logger';

export class AdminController {
  async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await dbService.listCustomers();
      // Attach 24h window status to each customer for ease of frontend consumption
      const enhancedCustomers = customers.map((c) => ({
        ...c,
        windowStatus: dbService.is24HourWindowOpen(c)
      }));
      res.json({ success: true, count: enhancedCustomers.length, data: enhancedCustomers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { phone, name, language = 'en', consentAgreed, consentText, source = 'added by owner' } = req.body;
      if (!phone) {
        res.status(400).json({ success: false, error: 'Phone number is required' });
        return;
      }

      // E.164 normalization
      const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0+/, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        res.status(400).json({
          success: false,
          error: 'Invalid phone format. Please enter a valid number with country code (8-15 digits).'
        });
        return;
      }

      if (!consentAgreed) {
        res.status(400).json({
          success: false,
          error: 'Consent confirmation is required. You must verify that this person agreed to receive WhatsApp messages.'
        });
        return;
      }

      const now = new Date().toISOString();
      const customer = await dbService.upsertCustomer(cleanPhone, name ? String(name).trim() : undefined, language as 'en' | 'hi', {
        source,
        optedIn: true,
        consentText: consentText || 'Confirmed agreement to receive business WhatsApp updates',
        consentAt: now
      });

      res.json({
        success: true,
        message: 'Customer added successfully with recorded consent',
        data: {
          ...customer,
          windowStatus: dbService.is24HourWindowOpen(customer)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async importCustomersCSV(req: Request, res: Response): Promise<void> {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ success: false, error: 'CSV data is empty or invalid' });
        return;
      }

      let importedCount = 0;
      let skippedNoConsent = 0;
      let skippedInvalidPhone = 0;
      const importedList: any[] = [];

      for (const row of rows) {
        const rawPhone = row.phone ? String(row.phone).trim() : '';
        const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0+/, '');

        // 1. Phone validation
        if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 15) {
          skippedInvalidPhone++;
          continue;
        }

        // 2. Consent validation (must have non-empty consent_date or consent flag)
        const consentVal = row.consent_date || row.consent;
        if (!consentVal || String(consentVal).trim() === '' || String(consentVal).toLowerCase() === 'false') {
          skippedNoConsent++;
          continue;
        }

        let consentDate = new Date().toISOString();
        if (typeof consentVal === 'string' && !isNaN(Date.parse(consentVal))) {
          consentDate = new Date(consentVal).toISOString();
        }

        const lang = row.language && String(row.language).toLowerCase().includes('hi') ? 'hi' : 'en';
        const name = row.name ? String(row.name).trim() : undefined;

        const customer = await dbService.upsertCustomer(cleanPhone, name, lang, {
          source: 'CSV',
          optedIn: true,
          consentText: `Imported via CSV with consent recorded (${consentVal})`,
          consentAt: consentDate
        });

        importedCount++;
        importedList.push(customer);
      }

      res.json({
        success: true,
        message: `${importedCount} imported, ${skippedNoConsent} skipped (no consent), ${skippedInvalidPhone} skipped (invalid phone)`,
        stats: {
          importedCount,
          skippedNoConsent,
          skippedInvalidPhone,
          total: rows.length
        },
        data: importedList
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulateInboundMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await dbService.findCustomerById(id);
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      await dbService.recordInboundCustomerMessage(customer.phone, customer.name || undefined);
      const updated = await dbService.findCustomerById(id);
      const windowStatus = dbService.is24HourWindowOpen(updated);

      res.json({
        success: true,
        message: `Simulated inbound message from ${customer.phone}. 24-hour window is now OPEN!`,
        data: updated,
        windowStatus
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await dbService.listOrders();
      res.json({ success: true, count: orders.length, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses: OrderStatus[] = ['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      const updated = await orderService.updateStatus(id, status);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      res.json({ success: true, message: `Order status updated to ${status} and customer notified`, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await dbService.listConversations();
      res.json({ success: true, count: conversations.length, data: conversations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async resumeBot(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, phone } = req.body;
      let targetCustomerId = customerId;

      if (!targetCustomerId && phone) {
        const customer = await dbService.findCustomerByPhone(phone);
        if (customer) targetCustomerId = customer.id;
      }

      if (!targetCustomerId) {
        res.status(400).json({ success: false, error: 'customerId or phone is required' });
        return;
      }

      const updated = await dbService.setBotPaused(targetCustomerId, false);
      res.json({ success: true, message: 'Bot resumed for customer', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async pauseBot(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, phone } = req.body;
      let targetCustomerId = customerId;

      if (!targetCustomerId && phone) {
        const customer = await dbService.findCustomerByPhone(phone);
        if (customer) targetCustomerId = customer.id;
      }

      if (!targetCustomerId) {
        res.status(400).json({ success: false, error: 'customerId or phone is required' });
        return;
      }

      const updated = await dbService.setBotPaused(targetCustomerId, true);
      res.json({ success: true, message: 'Bot paused for customer (human handoff)', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const {
        templateName = 'seasonal_offer',
        language = 'en_US',
        delayMs = 500,
        filterSource,
        consentAfterDate,
        languageFilter,
        variables,
        mode
      } = req.body;

      const result = await broadcastService.sendBroadcast({
        templateName,
        language,
        delayMs,
        filterSource,
        consentAfterDate,
        languageFilter,
        variables,
        mode
      });
      res.json({ success: true, message: 'Broadcast completed', data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getBroadcastProgress(req: Request, res: Response): Promise<void> {
    try {
      const progress = broadcastService.getProgress();
      res.json({ success: true, data: progress });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getBroadcastHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = broadcastService.getBroadcastHistory();
      res.json({ success: true, count: history.length, data: history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateCustomerOptIn(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { optedIn } = req.body;
      const updated = await dbService.updateCustomerOptInById(id, Boolean(optedIn));
      if (!updated) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }
      res.json({ success: true, message: `Customer opt-in set to ${optedIn}`, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateCustomerLanguage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { language } = req.body;
      if (language !== 'en' && language !== 'hi') {
        res.status(400).json({ success: false, error: 'Language must be "en" or "hi"' });
        return;
      }
      const updated = await dbService.updateCustomerLanguageById(id, language);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }
      res.json({ success: true, message: `Customer language set to ${language}`, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getMode(req: Request, res: Response): Promise<void> {
    const { whatsappService } = await import('../services/whatsapp.service');
    res.json({ success: true, mode: whatsappService.getMode() });
  }

  async setMode(req: Request, res: Response): Promise<void> {
    const { mode } = req.body;
    if (mode !== 'simulator' && mode !== 'live') {
      res.status(400).json({ success: false, error: 'Mode must be either "simulator" or "live"' });
      return;
    }
    const { whatsappService } = await import('../services/whatsapp.service');
    whatsappService.setMode(mode);
    res.json({ success: true, message: `Switched mode to ${mode}`, mode });
  }

  async getWhatsAppStatus(req: Request, res: Response): Promise<void> {
    const { whatsappToken, phoneNumberId, metaApiVersion } = envConfig;
    const { whatsappService } = await import('../services/whatsapp.service');
    const currentMode = whatsappService.getMode();

    if (!whatsappToken || whatsappToken.startsWith('EAAxxxx') || !phoneNumberId || phoneNumberId === '109876543210987') {
      res.json({
        success: true,
        configured: false,
        connected: false,
        mode: currentMode,
        phoneNumberId: phoneNumberId || 'Not Configured',
        message: 'Meta Cloud API is running with simulated sandbox credentials. Live sends require a valid WHATSAPP_TOKEN.'
      });
      return;
    }

    try {
      const url = `https://graph.facebook.com/${metaApiVersion}/${phoneNumberId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        const isExpired = response.status === 401 || data?.error?.code === 190;
        res.json({
          success: true,
          configured: true,
          connected: false,
          isExpired,
          errorCode: data?.error?.code || response.status,
          errorType: data?.error?.type || 'OAuthException',
          error: data?.error?.message || 'Failed to authenticate with Meta WhatsApp API',
          phoneNumberId,
          mode: currentMode
        });
        return;
      }

      res.json({
        success: true,
        configured: true,
        connected: true,
        phoneNumberId,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
        mode: currentMode
      });
    } catch (err: any) {
      res.json({
        success: true,
        configured: true,
        connected: false,
        error: `Network error connecting to Meta Graph API: ${err.message}`,
        phoneNumberId,
        mode: currentMode
      });
    }
  }

  async sendDirectMessage(req: Request, res: Response): Promise<void> {
    try {
      const {
        phone,
        name,
        type = 'text',
        text,
        templateName = 'hello_world',
        languageCode = 'en_US',
        variables,
        mode
      } = req.body;

      if (!phone) {
        res.status(400).json({ success: false, error: 'Phone number is required' });
        return;
      }

      // E.164 normalization: strip spaces, +, dashes, brackets, and leading zeros
      const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0+/, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        res.status(400).json({
          success: false,
          error: 'Invalid phone format. Please enter a valid number with country code (e.g. 919876543210).'
        });
        return;
      }

      // Find or auto-create customer
      let customer = await dbService.findCustomerByPhone(cleanPhone);
      if (!customer) {
        customer = await dbService.upsertCustomer(cleanPhone, name ? String(name).trim() : undefined, 'en', {
          source: 'added by owner',
          optedIn: true,
          consentText: 'Added directly by business owner from dashboard'
        });
      } else if (name && !customer.name) {
        customer = await dbService.upsertCustomer(cleanPhone, String(name).trim());
      }

      const windowStatus = dbService.is24HourWindowOpen(customer);

      // Strict Compliance: Enforce 24-hour customer window for free-form text
      if (type === 'text') {
        if (!text || !text.trim()) {
          res.status(400).json({ success: false, error: 'Message text cannot be empty' });
          return;
        }

        if (!windowStatus.isOpen) {
          res.status(400).json({
            success: false,
            error: '24-hour window closed. Send an approved template instead.',
            windowStatus
          });
          return;
        }
      } else if (type === 'template') {
        if (!templateName) {
          res.status(400).json({ success: false, error: 'Template name is required' });
          return;
        }

        if (!customer.optedIn) {
          res.status(400).json({
            success: false,
            error: 'Customer has opted out (STOP). Cannot message unsubscribed users per compliance regulations.'
          });
          return;
        }
      }

      // Format template variables if provided
      let components: any[] | undefined = undefined;
      if (type === 'template' && Array.isArray(variables) && variables.length > 0) {
        components = [
          {
            type: 'body',
            parameters: variables.map((v: string) => ({
              type: 'text',
              text: String(v)
            }))
          }
        ];
      }

      const { whatsappService } = await import('../services/whatsapp.service');
      const sendResult = await whatsappService.sendMessage(cleanPhone, {
        mode,
        type,
        text: text ? text.trim() : undefined,
        templateName,
        languageCode,
        components
      });

      if (!sendResult.success) {
        res.status(400).json({
          success: false,
          mode: sendResult.mode,
          status: sendResult.status,
          error: sendResult.error,
          customer,
          windowStatus
        });
        return;
      }

      res.json({
        success: true,
        mode: sendResult.mode,
        status: sendResult.status,
        messageId: sendResult.messageId,
        customer,
        windowStatus
      });
    } catch (err: any) {
      logger.error('Failed to send direct message', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendCustomerMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { text, type = 'text', templateName = 'hello_world', mode } = req.body;

      const customer = await dbService.findCustomerById(id);
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      const windowStatus = dbService.is24HourWindowOpen(customer);

      if (type === 'text') {
        if (!text || !text.trim()) {
          res.status(400).json({ success: false, error: 'Message text is required' });
          return;
        }

        if (!windowStatus.isOpen) {
          res.status(400).json({
            success: false,
            error: '24-hour window closed. Send an approved template instead.',
            windowStatus
          });
          return;
        }
      }

      const { whatsappService } = await import('../services/whatsapp.service');
      const sendResult = await whatsappService.sendMessage(customer.phone, {
        mode,
        type,
        text: text ? `[Staff Support]: ${text.trim()}` : undefined,
        templateName
      });

      if (!sendResult.success) {
        res.status(400).json({ success: false, error: sendResult.error, status: sendResult.status });
        return;
      }

      res.json({ success: true, message: 'Message sent to customer', result: sendResult, windowStatus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const messages = await dbService.listMessages();
      res.json({ success: true, count: messages.length, data: messages });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        ...businessConfig,
        phoneNumberId: envConfig.phoneNumberId,
        hasLiveToken: Boolean(envConfig.whatsappToken && !envConfig.whatsappToken.startsWith('EAAxxxx'))
      }
    });
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        tagline,
        category,
        currency,
        hours,
        address,
        supportPhone,
        website,
        defaultLanguage,
        welcomeMessageEn,
        welcomeMessageHi,
        menuItems,
        whatsappToken,
        phoneNumberId
      } = req.body;

      if (name !== undefined) businessConfig.name = name;
      if (tagline !== undefined) businessConfig.tagline = tagline;
      if (category !== undefined) businessConfig.category = category;
      if (currency !== undefined) businessConfig.currency = currency;
      if (hours !== undefined) businessConfig.hours = hours;
      if (address !== undefined) businessConfig.address = address;
      if (supportPhone !== undefined) businessConfig.supportPhone = supportPhone;
      if (website !== undefined) businessConfig.website = website;
      if (defaultLanguage !== undefined) businessConfig.defaultLanguage = defaultLanguage;
      if (welcomeMessageEn !== undefined) businessConfig.welcomeMessageEn = welcomeMessageEn;
      if (welcomeMessageHi !== undefined) businessConfig.welcomeMessageHi = welcomeMessageHi;
      if (menuItems !== undefined && Array.isArray(menuItems)) businessConfig.menuItems = menuItems;
      if (whatsappToken !== undefined) envConfig.whatsappToken = whatsappToken.trim();
      if (phoneNumberId !== undefined) envConfig.phoneNumberId = phoneNumberId.trim();

      logger.info('Business configuration, credentials and menu updated via Admin API', { name: businessConfig.name });
      res.json({ success: true, message: 'Business configuration and menu updated successfully', data: businessConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const adminController = new AdminController();
