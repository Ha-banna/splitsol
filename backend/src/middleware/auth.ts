import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { unauthorized } from '../utils/errors';

export interface AuthedRequest extends Request {
  userId: string;
  walletAddress: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized('Missing or invalid Authorization header'));
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    (req as AuthedRequest).userId = payload.sub;
    (req as AuthedRequest).walletAddress = payload.wallet;
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}
