import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAdminApiKey } from '../middleware/auth.middleware';

const router = Router();

// Protect all admin endpoints with API key verification
router.use(requireAdminApiKey);

router.get('/customers', (req, res) => adminController.getCustomers(req, res));
router.patch('/customers/:id/opt-in', (req, res) => adminController.updateCustomerOptIn(req, res));
router.patch('/customers/:id/language', (req, res) => adminController.updateCustomerLanguage(req, res));
router.post('/customers/:id/message', (req, res) => adminController.sendCustomerMessage(req, res));
router.get('/orders', (req, res) => adminController.getOrders(req, res));
router.patch('/orders/:id/status', (req, res) => adminController.updateOrderStatus(req, res));
router.get('/conversations', (req, res) => adminController.getConversations(req, res));
router.post('/resume-bot', (req, res) => adminController.resumeBot(req, res));
router.post('/pause-bot', (req, res) => adminController.pauseBot(req, res));
router.post('/broadcast', (req, res) => adminController.triggerBroadcast(req, res));
router.get('/broadcast/history', (req, res) => adminController.getBroadcastHistory(req, res));
router.get('/messages', (req, res) => adminController.getMessages(req, res));
router.get('/config', (req, res) => adminController.getConfig(req, res));
router.put('/config', (req, res) => adminController.updateConfig(req, res));

export default router;
