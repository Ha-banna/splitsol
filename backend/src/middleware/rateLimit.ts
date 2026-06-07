import rateLimit from 'express-rate-limit';
import { AuthedRequest } from './auth';

const isTest = process.env.NODE_ENV === 'test';

const rateLimitMessage = {
  error: 'Too many requests, please try again later.',
  code: 'RATE_LIMITED',
};

/** General API traffic (PRD §14 baseline) */
export const globalLimiter = rateLimit({
  windowMs: isTest ? 60_000 : 15 * 60 * 1000,
  limit: isTest ? 100 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

/** Auth endpoints — prevent brute-force signature / token attempts */
export const authLimiter = rateLimit({
  windowMs: isTest ? 60_000 : 15 * 60 * 1000,
  limit: isTest ? 50 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

/** Settlement prepare/confirm — 10 per minute per wallet (PRD §14) */
export const settlementLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: (req) => {
    const authed = req as AuthedRequest;
    return authed.walletAddress ?? req.body?.payer_wallet_address ?? req.ip ?? 'unknown';
  },
});

/** Group creation — 20 per day per user (PRD §14) */
export const groupCreateLimiter = rateLimit({
  windowMs: isTest ? 60_000 : 24 * 60 * 60 * 1000,
  limit: isTest ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: (req) => {
    const authed = req as AuthedRequest;
    return authed.userId ?? req.ip ?? 'unknown';
  },
});

/** Expense creation — 100 per day per user (PRD §14) */
export const expenseCreateLimiter = rateLimit({
  windowMs: isTest ? 60_000 : 24 * 60 * 60 * 1000,
  limit: isTest ? 100 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: (req) => {
    const authed = req as AuthedRequest;
    return authed.userId ?? req.ip ?? 'unknown';
  },
});
