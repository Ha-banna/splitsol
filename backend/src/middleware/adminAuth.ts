import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { unauthorized } from '../utils/errors';

/**
 * Protects admin routes. In production, requires ADMIN_API_KEY via X-Admin-Key header.
 * In development, admin is open when no key is configured (local dashboard only).
 */
export function requireAdminKey(req: Request, _res: Response, next: NextFunction): void {
  if (!env.adminApiKey) {
    if (env.isProduction) {
      next(unauthorized('Admin access is not configured'));
      return;
    }
    next();
    return;
  }

  const headerKey = req.headers['x-admin-key'];
  const key = typeof headerKey === 'string' ? headerKey : '';
  if (key !== env.adminApiKey) {
    next(unauthorized('Invalid admin key'));
    return;
  }
  next();
}
