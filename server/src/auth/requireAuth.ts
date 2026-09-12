import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';

/**
 * Guards routes that require a logged-in user. Passport populates
 * `req.user`/`req.isAuthenticated` from the session; this middleware is the
 * single choke point every protected route passes through.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(AppError.unauthorized());
  }
  next();
}
