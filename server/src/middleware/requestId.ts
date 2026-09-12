import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Generates (or propagates) X-Request-Id and stashes it in AsyncLocalStorage
 * so every log line AND every error response for this request carry the
 * same id, without threading it through every function signature.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  requestContext.run({ requestId }, next);
}
