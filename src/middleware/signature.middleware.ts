import { Request, Response, NextFunction } from 'express';
import { envConfig } from '../config';
import { validateMetaSignature } from '../utils/crypto';
import { logger } from '../utils/logger';

export interface RawBodyRequest extends Request {
  rawBody?: Buffer | string;
}

/**
 * Middleware to verify X-Hub-Signature-256 from Meta WhatsApp Cloud API
 */
export function verifyMetaWebhookSignature(req: RawBodyRequest, res: Response, next: NextFunction): void {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const isValid = validateMetaSignature(rawBody, signature, envConfig.appSecret);

  if (!isValid) {
    logger.warn('Failed webhook signature validation: request rejected with 403');
    res.status(403).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
}
