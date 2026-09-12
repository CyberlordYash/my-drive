import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/AppError.js';

function handler() {
  throw AppError.tooManyRequests();
}

// NOTE: these all rely on `app.set('trust proxy', 1)` being set in app.ts —
// without it, every request behind Render's load balancer appears to come
// from the same IP and the limiter locks out the whole app, not one abuser.

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
