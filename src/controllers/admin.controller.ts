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

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const messages = await dbService.listMessages();
      res.json({ success: true, count: messages.length, data: messages });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: businessConfig });
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { name, tagline, hours, address, supportPhone, website } = req.body;
      if (name) businessConfig.name = name;
      if (tagline) businessConfig.tagline = tagline;
      if (hours) businessConfig.hours = hours;
      if (address) businessConfig.address = address;
      if (supportPhone) businessConfig.supportPhone = supportPhone;
      if (website) businessConfig.website = website;

      res.json({ success: true, message: 'Business configuration updated', data: businessConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const adminController = new AdminController();
