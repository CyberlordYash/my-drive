import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

export const objectIdSchema = z
  .string()
  .refine((v) => isValidObjectId(v), { message: 'Invalid id' });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const listFilesQuerySchema = paginationSchema.extend({
  parentId: objectIdSchema.optional(),
  kind: z.enum(['file', 'folder']).optional(),
  sort: z.enum(['name', 'updatedAt', 'size']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  trashed: z.coerce.boolean().default(false),
  mime: z.string().optional(),
  modifiedAfter: z.coerce.date().optional(),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1).max(100),
  scope: z.enum(['all', 'owned', 'shared']).default('all'),
  mime: z.string().optional(),
});

export const idParamSchema = z.object({ id: objectIdSchema });

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: objectIdSchema.optional(),
});

export const patchFileSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    parentId: objectIdSchema.nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.parentId !== undefined, {
    message: 'At least one of name or parentId must be provided',
  });

export const deleteQuerySchema = z.object({
  permanent: z.coerce.boolean().default(false),
});

export const batchDeleteSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(100),
  permanent: z.coerce.boolean().default(false),
});

export const uploadQuerySchema = z.object({
  parentId: objectIdSchema.optional(),
});

export const createShareSchema = z.object({
  email: z.email(),
  role: z.enum(['viewer', 'editor']),
});

export const patchShareSchema = z.object({
  role: z.enum(['viewer', 'editor']),
});

export const shareParamSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
});

export const publicLinkSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const publicTokenParamSchema = z.object({
  token: z.string().min(16).max(128),
});
