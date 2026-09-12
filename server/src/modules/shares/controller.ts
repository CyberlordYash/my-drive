import type { Request, Response } from 'express';
import type { UserDoc } from '../../db/models/User.js';
import * as sharesService from './service.js';
import type { z } from 'zod';
import type { createShareSchema, patchShareSchema, publicLinkSchema } from '../../schemas/files.js';
import { env } from '../../config/env.js';
import { pathParam } from '../../lib/pathParam.js';

function user(req: Request): UserDoc {
  return req.user as UserDoc;
}

function toShareDTO(share: {
  _id?: unknown;
  userId?: unknown;
  email: string;
  role: string;
  sharedAt: Date;
}) {
  return {
    id: String(share._id),
    userId: share.userId ? String(share.userId) : null,
    email: share.email,
    role: share.role,
    sharedAt: share.sharedAt.toISOString(),
  };
}

export async function listShares(req: Request, res: Response) {
  const shares = await sharesService.listShares(user(req), pathParam(req, 'id'));
  res.json(shares.map(toShareDTO));
}

export async function createShare(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createShareSchema>;
  const share = await sharesService.createShare(user(req), pathParam(req, 'id'), body.email, body.role);
  res.status(201).json(toShareDTO(share));
}

export async function updateShare(req: Request, res: Response) {
  const body = req.body as z.infer<typeof patchShareSchema>;
  const share = await sharesService.updateShareRole(
    user(req),
    pathParam(req, 'id'),
    pathParam(req, 'userId'),
    body.role,
  );
  res.json(toShareDTO(share));
}

export async function deleteShare(req: Request, res: Response) {
  await sharesService.revokeShare(user(req), pathParam(req, 'id'), pathParam(req, 'userId'));
  res.status(204).send();
}

export async function createLink(req: Request, res: Response) {
  const body = req.body as z.infer<typeof publicLinkSchema>;
  const link = await sharesService.createPublicLink(user(req), pathParam(req, 'id'), body.expiresInDays);
  res.status(201).json({
    url: `${env.WEB_ORIGIN}/s/${link.token}`,
    token: link.token,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
  });
}

export async function deleteLink(req: Request, res: Response) {
  await sharesService.revokePublicLink(user(req), pathParam(req, 'id'));
  res.status(204).send();
}
