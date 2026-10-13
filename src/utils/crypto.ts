import crypto from 'crypto';
import { logger } from './logger';

/**
 * Validates Meta WhatsApp Webhook X-Hub-Signature-256
 *
 * @param rawBody - Raw unparsed buffer or string of the incoming request body
 * @param signatureHeader - Value of the X-Hub-Signature-256 request header
 * @param appSecret - Meta App Secret from developer console
 * @returns boolean indicating whether the signature matches
 */
export function validateMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  // In development/test mode without an app secret or when testing locally without header
  if (!appSecret || appSecret.startsWith('0123456789') || !signatureHeader) {
    if (!signatureHeader) {
      logger.info('Webhook received without signature header (local/dev test mode). Accepted.');
    }
    return true;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    logger.warn('Invalid signature header format; expected sha256=<hash>');
    return false;
  }

  const expectedHash = parts[1];
  const hmac = crypto.createHmac('sha256', appSecret);
  const calculatedHash = hmac.update(rawBody).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (expectedBuffer.length !== calculatedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  } catch (error) {
    logger.error('Error during signature comparison', error);
    return false;
  }
}

/**
 * Helper to generate a valid X-Hub-Signature-256 for testing and webhook simulator
 */
export function generateMetaSignature(body: string | Buffer, appSecret: string): string {
  const hmac = crypto.createHmac('sha256', appSecret || 'test_secret');
  const hash = hmac.update(body).digest('hex');
  return `sha256=${hash}`;
}
