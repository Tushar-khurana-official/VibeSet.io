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
  // In development/test mode without an app secret configured, allow testing with log warning
  if (!appSecret) {
    logger.warn('APP_SECRET is not configured. Webhook signature verification bypassed for testing.');
    return true;
  }

  if (!signatureHeader) {
    logger.warn('Missing X-Hub-Signature-256 header in webhook request');
    return false;
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
