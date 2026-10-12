import { Request, Response, NextFunction } from 'express';
import { envConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Middleware protecting admin routes using X-Admin-Api-Key or Bearer token
 */
export function requireAdminApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKeyHeader = req.headers['x-admin-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;

  let providedKey = apiKeyHeader;
  if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  }

  const expectedKey = envConfig.adminApiKey;

  // In test mode or when matching
  if (!expectedKey || providedKey === expectedKey) {
    next();
    return;
  }

  logger.warn('Unauthorized admin API attempt with invalid key');
  res.status(401).json({ error: 'Unauthorized: Invalid Admin API Key' });
}
