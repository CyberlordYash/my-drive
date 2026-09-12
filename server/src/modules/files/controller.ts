import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../../lib/AppError.js';
import { pathParam } from '../../lib/pathParam.js';
import type { UserDoc } from '../../db/models/User.js';
import { toFileDTO } from './dto.js';
import { streamOrRedirect } from './download.js';
import * as filesService from './service.js';
import type {
  createFolderSchema,
  listFilesQuerySchema,
  patchFileSchema,
  searchQuerySchema,
  batchDeleteSchema,
  paginationSchema,
  deleteQuerySchema,
  uploadQuerySchema,
} from '../../schemas/files.js';
import type { z } from 'zod';

function user(req: Request): UserDoc {
  return req.user as UserDoc;
}

function query<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

export async function listFiles(req: Request, res: Response) {
  const q = query<z.infer<typeof listFilesQuerySchema>>(req);
  const { docs, nextCursor } = await filesService.listFiles(user(req), q);
  const dtos = await Promise.all(
    docs.map(async (d) => toFileDTO(d, d.ownerId.equals(user(req)._id) ? 'owner' : 'viewer')),
  );
  res.json({ data: dtos, page: { limit: q.limit, nextCursor } });
}

export async function searchFiles(req: Request, res: Response) {
  const q = query<z.infer<typeof searchQuerySchema>>(req);
  const { docs, nextCursor } = await filesService.searchFiles(user(req), q);
  const dtos = docs.map((d) => toFileDTO(d, d.ownerId.equals(user(req)._id) ? 'owner' : 'viewer'));
  res.json({ data: dtos, page: { limit: q.limit, nextCursor } });
}

export async function getFile(req: Request, res: Response) {
  const { node, role } = await filesService.getFileWithRole(user(req), pathParam(req, 'id'));
  const breadcrumbs = await filesService.getBreadcrumbs(user(req), pathParam(req, 'id'));
  res.json({ ...toFileDTO(node, role), breadcrumbs });
}

export async function createFolder(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createFolderSchema>;
  const { node, role } = await filesService.createFolder(user(req), body.name, body.parentId);
  res.status(201).json(toFileDTO(node, role));
}

export async function uploadFiles(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw AppError.badRequest('NO_FILE', 'No file was uploaded');
  }
  const q = query<z.infer<typeof uploadQuerySchema>>(req);

  const results = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await filesService.uploadFile(
      user(req),
      {
        tempPath: file.path,
        originalName: file.originalname,
        declaredMimeType: file.mimetype,
        size: file.size,
      },
      q.parentId,
    );
    results.push(toFileDTO(doc, 'owner'));
  }

  res.status(201).json(results);
}

export async function patchFile(req: Request, res: Response) {
  const body = req.body as z.infer<typeof patchFileSchema>;
  const { node, role } = await filesService.renameOrMove(user(req), pathParam(req, 'id'), body);
  res.json(toFileDTO(node, role));
}

export async function copyFile(req: Request, res: Response) {
  const doc = await filesService.copyFile(user(req), pathParam(req, 'id'));
  res.status(201).json(toFileDTO(doc, 'owner'));
}

export async function toggleStar(req: Request, res: Response) {
  const { node, role } = await filesService.toggleStar(user(req), pathParam(req, 'id'));
  res.json(toFileDTO(node, role));
}

export async function listStarred(req: Request, res: Response) {
  const q = query<z.infer<typeof paginationSchema>>(req);
  const { docs, nextCursor } = await filesService.listStarred(user(req), q.limit, q.cursor);
  res.json({ data: docs.map((d) => toFileDTO(d, 'owner')), page: { limit: q.limit, nextCursor } });
}

export async function downloadFile(req: Request, res: Response) {
  const { node } = await filesService.getFileWithRole(user(req), pathParam(req, 'id'));
  await streamOrRedirect(node, res, { inline: false, rangeHeader: req.headers.range });
}

export async function contentFile(req: Request, res: Response) {
  const { node } = await filesService.getFileWithRole(user(req), pathParam(req, 'id'));
  const inline = req.query.inline === '1' || req.query.inline === 'true';
  await streamOrRedirect(node, res, { inline, rangeHeader: req.headers.range });
}

export async function deleteFile(req: Request, res: Response) {
  const q = query<z.infer<typeof deleteQuerySchema>>(req);
  if (q.permanent) await filesService.permanentlyDeleteFile(user(req), pathParam(req, 'id'));
  else await filesService.trashFile(user(req), pathParam(req, 'id'));
  res.status(204).send();
}

export async function restoreFile(req: Request, res: Response) {
  const { node, role } = await filesService.restoreFile(user(req), pathParam(req, 'id'));
  res.json(toFileDTO(node, role));
}

export async function batchDelete(req: Request, res: Response) {
  const body = req.body as z.infer<typeof batchDeleteSchema>;
  const result = await filesService.batchDelete(user(req), body.ids, body.permanent);
  res.json(result);
}

export async function listTrash(req: Request, res: Response) {
  const q = query<z.infer<typeof paginationSchema>>(req);
  const { docs, nextCursor } = await filesService.listTrash(user(req), q.limit, q.cursor);
  res.json({ data: docs.map((d) => toFileDTO(d, 'owner')), page: { limit: q.limit, nextCursor } });
}

export async function emptyTrash(req: Request, res: Response) {
  const result = await filesService.emptyTrash(user(req));
  res.json(result);
}

export async function listSharedWithMe(req: Request, res: Response) {
  const q = query<z.infer<typeof paginationSchema>>(req);
  const { docs, nextCursor } = await filesService.listSharedWithMe(user(req), q.limit, q.cursor);
  const dtos = docs.map((d) => toFileDTO(d, 'viewer'));
  res.json({ data: dtos, page: { limit: q.limit, nextCursor } });
}

export async function getStorageUsage(req: Request, res: Response) {
  const usage = await filesService.getStorageUsage(user(req));
  res.json(usage);
}

export function ensureObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('INVALID_ID', 'Invalid id');
}
