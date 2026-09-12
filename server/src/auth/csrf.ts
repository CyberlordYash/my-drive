import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env, isProd } from '../config/env.js';
import { AppError } from '../lib/AppError.js';

const CSRF_COOKIE = 'drive_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF token, layered behind the SameSite=Lax session cookie
 * as defense-in-depth. SameSite=Lax already blocks a forged cross-SITE POST
 * from carrying the cookie — but drive.yashsachan.com and api.yashsachan.com
 * are *siblings* under the same registrable domain, so if any other
 * subdomain were ever compromised (XSS), it could still issue same-site
 * requests. This token is what stops that: the attacker can read our cookie
 * jar (same-site), but can't read the value to echo it back in a header
 * without an XSS on THIS origin specifically.
 */
export function issueCsrfCookie(res: Response) {
  const token = randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // client JS must be able to read this to echo it back
    secure: isProd,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(CSRF_COOKIE, {
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string' ||
    cookieToken.length === 0 ||
    cookieToken.length !== headerToken.length
  ) {
    return next(AppError.forbidden('CSRF token missing or invalid', 'CSRF_FAILED'));
  }

  const ok = timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!ok) {
    return next(AppError.forbidden('CSRF token missing or invalid', 'CSRF_FAILED'));
  }
  next();
}
