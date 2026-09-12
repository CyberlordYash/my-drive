import type { Request } from 'express';
import { AppError } from './AppError.js';

/**
 * Express's own types declare req.params values as `string | string[]`
 * (to account for repeated route segments), but every route param in this
 * app is a single named segment validated by zod beforehand — so this
 * narrows it to `string` for the controllers instead of sprinkling
 * non-null assertions and array-vs-string checks everywhere.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw AppError.badRequest('INVALID_PARAM', `Missing path parameter: ${name}`);
  }
  return value;
}
