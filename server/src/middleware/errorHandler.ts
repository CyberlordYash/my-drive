import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { ZodError, z } from 'zod';
import { AppError } from '../lib/AppError.js';
import { logger } from '../config/logger.js';
import { getRequestId } from './requestId.js';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return AppError.validation(z.treeifyError(err));
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return AppError.payloadTooLarge('FILE_TOO_LARGE', 'File exceeds the maximum allowed size');
    }
    return AppError.badRequest('UPLOAD_ERROR', err.message);
  }

  if (err instanceof mongoose.Error.CastError) {
    // err.value is `unknown` at runtime — it can be a string, an ObjectId,
    // or (if a query filter got mangled upstream, as sanitizeFilter used to
    // do — see db/connect.ts) an entire object. Blindly interpolating a
    // non-string value into a template produces the unhelpful literal
    // "[object Object]"; stringify it properly so the message is actually
    // diagnosable if this ever fires again.
    const safeValue =
      typeof err.value === 'string' ? err.value : JSON.stringify(err.value, null, 0);
    return AppError.badRequest('INVALID_ID', `Invalid identifier: ${safeValue}`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return AppError.validation(err.errors);
  }

  // Mongo duplicate-key error (E11000) — surfaces as a plain object with a
  // numeric `code`, not a mongoose class, because it comes from the driver.
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  ) {
    return AppError.conflict('NAME_CONFLICT', 'A file or folder with that name already exists here');
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return AppError.badRequest('MALFORMED_JSON', 'Request body is not valid JSON');
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  return AppError.internal(message);
}

/**
 * Single terminal error handler — every route funnels here (Express 5
 * auto-forwards rejected promises, so no asyncHandler wrapper is needed
 * anywhere in the codebase). Normalizes every error class we expect to see
 * into the one response envelope, logs with full detail server-side, and
 * NEVER leaks a raw message/stack for an unclassified error.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const appErr = toAppError(err);
  const requestId = getRequestId();

  const logPayload = {
    requestId,
    userId: (req as Request & { user?: { id?: string } }).user?.id,
    route: `${req.method} ${req.originalUrl}`,
    code: appErr.code,
    status: appErr.status,
  };

  if (appErr.status >= 500) {
    logger.error({ ...logPayload, err }, 'Request failed');
  } else {
    logger.warn(logPayload, 'Request rejected');
  }

  const body: ErrorEnvelope = {
    error: {
      code: appErr.code,
      message: appErr.expose ? appErr.message : 'Something went wrong. Please try again.',
      details: appErr.expose ? appErr.details : undefined,
      requestId,
    },
  };

  res.status(appErr.status).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found', requestId: getRequestId() },
  });
}
