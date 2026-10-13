import { Request, Response } from 'express';
import { dbService, OrderStatus } from '../services/db.service';
import { orderService } from '../services/order.service';
import { broadcastService } from '../services/broadcast.service';
import { businessConfig } from '../config';
import { logger } from '../utils/logger';

export class AdminController {
  async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await dbService.listCustomers();
      res.json({ success: true, count: customers.length, data: customers });
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

  async triggerBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const { templateName = 'seasonal_offer', language = 'en_US', delayMs = 600 } = req.body;
      const result = await broadcastService.sendBroadcast({
        templateName,
        language,
        delayMs
      });
      res.json({ success: true, message: 'Broadcast completed', data: result });
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

  async pauseBot(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.body;
      if (!customerId) {
        res.status(400).json({ success: false, error: 'customerId is required' });
        return;
      }
      const updated = await dbService.setBotPaused(customerId, true);
      res.json({ success: true, message: 'Bot paused for customer (human handoff)', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendCustomerMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { text } = req.body;
      if (!text || !text.trim()) {
        res.status(400).json({ success: false, error: 'Message text is required' });
        return;
      }

      const customer = await dbService.findCustomerById(id);
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      const { whatsappService } = await import('../services/whatsapp.service');
      await whatsappService.sendText(customer.phone, `[Staff Support]: ${text}`);

      res.json({ success: true, message: 'Message sent to customer' });
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
    const { envConfig } = await import('../config');
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
      const { envConfig } = await import('../config');
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
