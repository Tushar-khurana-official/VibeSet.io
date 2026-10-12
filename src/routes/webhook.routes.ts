import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { verifyMetaWebhookSignature } from '../middleware/signature.middleware';

const router = Router();

// GET /webhook - Meta Webhook Verification
router.get('/', (req, res) => {
  webhookController.verifyWebhook(req, res);
});

// POST /webhook - Meta Webhook Payload Receiver
router.post('/', verifyMetaWebhookSignature, (req, res) => {
  webhookController.handleWebhook(req, res);
});

export default router;
