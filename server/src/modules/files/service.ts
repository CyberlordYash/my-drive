import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { fileTypeFromFile } from 'file-type';
import { FileNode, type FileNodeDoc } from '../../db/models/FileNode.js';
import { User, type UserDoc } from '../../db/models/User.js';
import { ActivityLog } from '../../db/models/ActivityLog.js';
import { AppError } from '../../lib/AppError.js';
import { escapeRegex } from '../../lib/escapeRegex.js';
import { assertValidName, resolveNameCollision } from '../../lib/sanitizeName.js';
import { buildStorageKey } from '../../lib/keys.js';
import { resolveAccess, assertAccess } from '../../access/resolveAccess.js';
import { getStorageAdapter } from '../../storage/index.js';
import { siblingNameExists, buildAncestorIds, findDescendantIds, getBreadcrumbTrail } from './repo.js';

const DISALLOWED_MIME_PREFIXES = ['application/x-msdownload', 'application/x-executable'];

async function loadNodeOrThrow(id: string): Promise<FileNodeDoc> {
  const node = await FileNode.findById(id);
  if (!node) throw AppError.notFound('FILE_NOT_FOUND', 'File not found');
  return node;
}

async function loadParentOrNull(parentId: string | undefined, user: UserDoc): Promise<FileNodeDoc | null> {
  if (!parentId) return null;
  const parent = await loadNodeOrThrow(parentId);
  if (parent.kind !== 'folder') throw AppError.badRequest('INVALID_PARENT', 'Parent must be a folder');
  await assertAccess(user._id, parent, 'editor');
  return parent;
}

function logActivity(actorId: Types.ObjectId, fileId: Types.ObjectId, action: string, meta?: unknown) {
  void ActivityLog.create({ actorId, fileId, action, meta }).catch(() => {
    /* activity logging must never fail the primary operation */
  });
}

// ---------------------------------------------------------------------------
// Listing / search
// ---------------------------------------------------------------------------

export interface ListQuery {
  parentId?: string;
  kind?: 'file' | 'folder';
  sort: 'name' | 'updatedAt' | 'size';
  order: 'asc' | 'desc';
  trashed: boolean;
  mime?: string;
  modifiedAfter?: Date;
  limit: number;
  cursor?: string;
}

export async function listFiles(user: UserDoc, q: ListQuery) {
  const filter: Record<string, unknown> = {
    ownerId: user._id,
    isTrashed: q.trashed,
  };
  if (q.parentId) filter.parentId = new Types.ObjectId(q.parentId);
  else if (!q.trashed) filter.parentId = null;
  if (q.kind) filter.kind = q.kind;
  if (q.mime) filter.mimeType = q.mime;
  if (q.modifiedAfter) filter.updatedAt = { $gte: q.modifiedAfter };
  if (q.cursor) filter._id = { $gt: new Types.ObjectId(q.cursor) };

  const sortField = q.sort === 'name' ? 'nameLower' : q.sort;
  const sortDir = q.order === 'asc' ? 1 : -1;

  const docs = await FileNode.find(filter)
    .sort({ kind: -1, [sortField]: sortDir, _id: 1 }) // folders first, then requested sort
    .limit(q.limit + 1)
    .exec();

  const hasMore = docs.length > q.limit;
  const page = hasMore ? docs.slice(0, q.limit) : docs;
  const nextCursor = hasMore ? page[page.length - 1]?._id.toString() : undefined;

  return { docs: page, nextCursor };
}

export async function searchFiles(
  user: UserDoc,
  params: { q: string; scope: 'all' | 'owned' | 'shared'; mime?: string; limit: number; cursor?: string },
) {
  const pattern = escapeRegex(params.q.trim().toLowerCase()).slice(0, 100);
  const filter: Record<string, unknown> = {
    isTrashed: false,
    nameLower: { $regex: pattern },
  };

  if (params.scope === 'owned') filter.ownerId = user._id;
  else if (params.scope === 'shared') filter['sharedWith.userId'] = user._id;
  else filter.aclUserIds = user._id; // 'all' — covers owned + shared via the denormalized array

  if (params.mime) filter.mimeType = params.mime;
  if (params.cursor) filter._id = { $gt: new Types.ObjectId(params.cursor) };

  const docs = await FileNode.find(filter)
    .sort({ _id: 1 })
    .limit(params.limit + 1)
    .exec();

  const hasMore = docs.length > params.limit;
  const page = hasMore ? docs.slice(0, params.limit) : docs;
  const nextCursor = hasMore ? page[page.length - 1]?._id.toString() : undefined;

  return { docs: page, nextCursor };
}

export async function listSharedWithMe(user: UserDoc, limit: number, cursor?: string) {
  const filter: Record<string, unknown> = {
    isTrashed: false,
    'sharedWith.userId': user._id,
  };
  if (cursor) filter._id = { $gt: new Types.ObjectId(cursor) };

  const docs = await FileNode.find(filter).sort({ _id: 1 }).limit(limit + 1).exec();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  return { docs: page, nextCursor: hasMore ? page[page.length - 1]?._id.toString() : undefined };
}

// ---------------------------------------------------------------------------
// Read a single node (with access check)
// ---------------------------------------------------------------------------

export async function getFileWithRole(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  const role = await assertAccess(user._id, node, 'viewer');
  return { node, role };
}

export async function getBreadcrumbs(user: UserDoc, id: string) {
  const { node } = await getFileWithRole(user, id);
  return getBreadcrumbTrail(node);
}

// ---------------------------------------------------------------------------
// Create folder
// ---------------------------------------------------------------------------

export async function createFolder(user: UserDoc, name: string, parentId?: string) {
  const validName = assertValidName(name);
  const parent = await loadParentOrNull(parentId, user);

  const exists = await siblingNameExists(user._id, parent?._id ?? null, validName);
  if (exists) throw AppError.conflict('NAME_CONFLICT', 'A file or folder with that name already exists here');

  const folder = await FileNode.create({
    kind: 'folder',
    name: validName,
    nameLower: validName.toLowerCase(),
    ownerId: user._id,
    parentId: parent?._id ?? null,
    ancestorIds: buildAncestorIds(parent),
  });

  logActivity(user._id, folder._id, 'upload', { kind: 'folder' });
  return { node: folder, role: 'owner' as const };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadedFileInput {
  tempPath: string;
  originalName: string;
  declaredMimeType: string;
  size: number;
}

export async function uploadFile(user: UserDoc, input: UploadedFileInput, parentId?: string) {
  const parent = await loadParentOrNull(parentId, user);

  // Re-check quota against the actual bytes on disk (the pre-check in the
  // controller only had Content-Length, which a client can lie about).
  const freshUser = await User.findById(user._id);
  if (!freshUser) throw AppError.unauthorized();
  if (freshUser.storageUsed + input.size > freshUser.storageQuota) {
    await fs.rm(input.tempPath, { force: true });
    throw AppError.quotaExceeded();
  }

  // Sniff the real content type from the first bytes — never trust the
  // client-declared Content-Type. Rejects e.g. an .exe renamed to .png.
  const sniffed = await fileTypeFromFile(input.tempPath).catch(() => undefined);
  const mimeType = sniffed?.mime ?? input.declaredMimeType ?? 'application/octet-stream';
  if (DISALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
    await fs.rm(input.tempPath, { force: true });
    throw AppError.unsupportedType();
  }

  const validName = assertValidName(input.originalName);
  const finalName = await resolveNameCollision(validName, (candidate) =>
    siblingNameExists(user._id, parent?._id ?? null, candidate),
  );

  const storageKey = buildStorageKey(user._id.toString(), finalName);
  const adapter = getStorageAdapter();

  // Compute a checksum while streaming to storage — free integrity/dedup
  // signal, no extra pass over the file.
  const hash = createHash('sha256');
  const fileStream = createReadStream(input.tempPath);
  fileStream.on('data', (chunk) => hash.update(chunk as Buffer));

  try {
    const result = await adapter.put({ key: storageKey, body: fileStream, contentType: mimeType });

    const doc = await FileNode.create({
      kind: 'file',
      name: finalName,
      nameLower: finalName.toLowerCase(),
      ownerId: user._id,
      parentId: parent?._id ?? null,
      ancestorIds: buildAncestorIds(parent),
      storageKey,
      storageDriver: adapter.driver,
      size: result.size,
      mimeType,
      checksumSha256: hash.digest('hex'),
    });

    await User.updateOne({ _id: user._id }, { $inc: { storageUsed: result.size } });
    logActivity(user._id, doc._id, 'upload', { size: result.size });

    return doc;
  } catch (err) {
    // Compensating action: never leave an orphaned blob if the DB write
    // (or anything else) fails after the bytes already landed in storage.
    await adapter.delete(storageKey).catch(() => {});
    throw err;
  } finally {
    await fs.rm(input.tempPath, { force: true });
  }
}

// ---------------------------------------------------------------------------
// Rename / move
// ---------------------------------------------------------------------------

export async function renameOrMove(
  user: UserDoc,
  id: string,
  patch: { name?: string; parentId?: string | null },
) {
  const node = await loadNodeOrThrow(id);
  await assertAccess(user._id, node, 'editor');

  let newParent: FileNodeDoc | null = null;
  if (patch.parentId !== undefined) {
    if (patch.parentId === null) {
      newParent = null;
    } else {
      newParent = await loadNodeOrThrow(patch.parentId);
      if (newParent.kind !== 'folder') {
        throw AppError.badRequest('INVALID_PARENT', 'Target must be a folder');
      }
      await assertAccess(user._id, newParent, 'editor');

      // Prevent moving a folder into its own subtree (including itself).
      if (
        newParent._id.equals(node._id) ||
        newParent.ancestorIds.some((a) => a.equals(node._id))
      ) {
        throw AppError.badRequest('INVALID_MOVE', 'Cannot move a folder into its own subtree');
      }
    }
  }

  const targetParentId = patch.parentId !== undefined ? newParent?._id ?? null : (node.parentId ?? null);
  const targetName = patch.name ? assertValidName(patch.name) : node.name;

  const exists = await siblingNameExists(node.ownerId, targetParentId, targetName, node._id);
  if (exists) throw AppError.conflict('NAME_CONFLICT', 'A file or folder with that name already exists here');

  const oldAncestorIds = node.ancestorIds;
  const newAncestorIds = patch.parentId !== undefined ? buildAncestorIds(newParent) : node.ancestorIds;

  node.name = targetName;
  node.parentId = targetParentId;
  node.ancestorIds = newAncestorIds;
  await node.save();

  // If this node is a folder and it moved, every descendant's ancestorIds
  // needs the old prefix swapped for the new one so cascading access checks
  // and subtree queries stay correct.
  if (node.kind === 'folder' && patch.parentId !== undefined) {
    const descendantIds = await findDescendantIds(node._id);
    if (descendantIds.length > 0) {
      const descendants = await FileNode.find({ _id: { $in: descendantIds } });
      await Promise.all(
        descendants.map((d) => {
          const suffix = d.ancestorIds.slice(oldAncestorIds.length);
          d.ancestorIds = [...newAncestorIds, ...suffix];
          return d.save();
        }),
      );
    }
  }

  logActivity(user._id, node._id, patch.name ? 'rename' : 'move', patch);
  const role = await assertAccess(user._id, node, 'viewer');
  return { node, role };
}

// ---------------------------------------------------------------------------
// Copy ("Make a copy")
// ---------------------------------------------------------------------------

export async function copyFile(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  await assertAccess(user._id, node, 'viewer');

  if (node.kind === 'folder') {
    throw AppError.badRequest('COPY_UNSUPPORTED', 'Copying folders is not supported yet');
  }

  const freshUser = await User.findById(user._id);
  if (!freshUser) throw AppError.unauthorized();
  const size = node.size ?? 0;
  if (freshUser.storageUsed + size > freshUser.storageQuota) {
    throw AppError.quotaExceeded();
  }

  const copyName = await resolveNameCollision(`Copy of ${node.name}`, (candidate) =>
    siblingNameExists(user._id, node.parentId ?? null, candidate),
  );
  const newKey = buildStorageKey(user._id.toString(), copyName);

  const adapter = getStorageAdapter();
  await adapter.copy(node.storageKey!, newKey);

  const copyDoc = await FileNode.create({
    kind: 'file',
    name: copyName,
    nameLower: copyName.toLowerCase(),
    ownerId: user._id,
    parentId: node.parentId,
    ancestorIds: node.ancestorIds,
    storageKey: newKey,
    storageDriver: adapter.driver,
    size: node.size,
    mimeType: node.mimeType,
  });

  await User.updateOne({ _id: user._id }, { $inc: { storageUsed: size } });
  logActivity(user._id, copyDoc._id, 'copy', { sourceId: node._id });

  return copyDoc;
}

// ---------------------------------------------------------------------------
// Star
// ---------------------------------------------------------------------------

export async function toggleStar(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  const role = await assertAccess(user._id, node, 'viewer');
  node.isStarred = !node.isStarred;
  await node.save();
  logActivity(user._id, node._id, node.isStarred ? 'star' : 'unstar');
  return { node, role };
}

export async function listStarred(user: UserDoc, limit: number, cursor?: string) {
  const filter: Record<string, unknown> = { ownerId: user._id, isStarred: true, isTrashed: false };
  if (cursor) filter._id = { $gt: new Types.ObjectId(cursor) };
  const docs = await FileNode.find(filter).sort({ _id: 1 }).limit(limit + 1).exec();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  return { docs: page, nextCursor: hasMore ? page[page.length - 1]?._id.toString() : undefined };
}

// ---------------------------------------------------------------------------
// Trash / restore / permanent delete
// ---------------------------------------------------------------------------

export async function trashFile(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  await assertAccess(user._id, node, 'owner'); // only the owner can trash — editors cannot delete

  const ids = node.kind === 'folder' ? [node._id, ...(await findDescendantIds(node._id))] : [node._id];
  await FileNode.updateMany(
    { _id: { $in: ids } },
    { $set: { isTrashed: true, trashedAt: new Date(), trashedFrom: node.parentId } },
  );

  logActivity(user._id, node._id, 'delete', { permanent: false, affected: ids.length });
}

export async function restoreFile(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  await assertAccess(user._id, node, 'owner');

  // If the original parent was trashed/deleted since, restore to root
  // instead of leaving the node in a broken, unreachable state.
  let targetParentId = node.trashedFrom;
  if (targetParentId) {
    const parent = await FileNode.findOne({ _id: targetParentId, isTrashed: false });
    if (!parent) targetParentId = null;
  }

  // Descendants (if any) are restored via a bulk update — but the top-level
  // `node` we already loaded into memory is updated and saved directly and
  // ONLY once, in-memory fields first, so a later node.save() can never
  // clobber the bulk update with stale isTrashed/trashedAt/trashedFrom
  // values still sitting in this object.
  const descendantIds = node.kind === 'folder' ? await findDescendantIds(node._id) : [];
  if (descendantIds.length > 0) {
    await FileNode.updateMany(
      { _id: { $in: descendantIds } },
      { $set: { isTrashed: false, trashedAt: null, trashedFrom: null } },
    );
  }

  node.isTrashed = false;
  node.trashedAt = null;
  node.trashedFrom = null;
  node.parentId = targetParentId;
  await node.save();

  logActivity(user._id, node._id, 'restore');
  const role = await assertAccess(user._id, node, 'viewer');
  return { node, role };
}

export async function permanentlyDeleteFile(user: UserDoc, id: string) {
  const node = await loadNodeOrThrow(id);
  await assertAccess(user._id, node, 'owner');
  await deleteSubtreePermanently(node);
}

async function deleteSubtreePermanently(node: FileNodeDoc) {
  const descendantIds = node.kind === 'folder' ? await findDescendantIds(node._id) : [];
  const allIds = [node._id, ...descendantIds];
  const allDocs = await FileNode.find({ _id: { $in: allIds } });

  const adapter = getStorageAdapter();
  const keysToDelete = allDocs.filter((d) => d.storageKey).map((d) => d.storageKey!);
  // Delete blobs BEFORE the metadata docs — if this crashes partway, we're
  // left with orphaned blobs (recoverable via a cleanup sweep) rather than
  // metadata pointing at already-deleted blobs.
  if (keysToDelete.length > 0) await adapter.deleteMany(keysToDelete);

  const freedBytes = allDocs.reduce((sum, d) => sum + (d.size ?? 0), 0);
  await FileNode.deleteMany({ _id: { $in: allIds } });
  if (freedBytes > 0) {
    await User.updateOne({ _id: node.ownerId }, { $inc: { storageUsed: -freedBytes } });
  }
}

export async function emptyTrash(user: UserDoc) {
  const trashed = await FileNode.find({ ownerId: user._id, isTrashed: true });
  // Only delete top-level trashed nodes directly; their descendants get
  // swept in by deleteSubtreePermanently to avoid double-counting freed
  // bytes for nodes trashed as part of a folder.
  const trashedIds = new Set(trashed.map((t) => t._id.toString()));
  const topLevel = trashed.filter((t) => !t.trashedFrom || !trashedIds.has(t.trashedFrom.toString()));
  for (const node of topLevel) {
    // eslint-disable-next-line no-await-in-loop
    await deleteSubtreePermanently(node);
  }
  return { deleted: topLevel.length };
}

export async function listTrash(user: UserDoc, limit: number, cursor?: string) {
  const filter: Record<string, unknown> = { ownerId: user._id, isTrashed: true };
  if (cursor) filter._id = { $gt: new Types.ObjectId(cursor) };
  const docs = await FileNode.find(filter).sort({ trashedAt: -1, _id: 1 }).limit(limit + 1).exec();
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  return { docs: page, nextCursor: hasMore ? page[page.length - 1]?._id.toString() : undefined };
}

// ---------------------------------------------------------------------------
// Batch delete
// ---------------------------------------------------------------------------

export async function batchDelete(user: UserDoc, ids: string[], permanent: boolean) {
  const failed: Array<{ id: string; reason: string }> = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      if (permanent) await permanentlyDeleteFile(user, id);
      // eslint-disable-next-line no-await-in-loop
      else await trashFile(user, id);
      deleted += 1;
    } catch (err) {
      failed.push({ id, reason: err instanceof AppError ? err.code : 'UNKNOWN_ERROR' });
    }
  }
  return { deleted, failed };
}

// ---------------------------------------------------------------------------
// Storage usage summary
// ---------------------------------------------------------------------------

export async function getStorageUsage(user: UserDoc) {
  const fresh = await User.findById(user._id);
  if (!fresh) throw AppError.unauthorized();
  const fileCount = await FileNode.countDocuments({
    ownerId: user._id,
    kind: 'file',
    isTrashed: false,
  });
  return { used: fresh.storageUsed, quota: fresh.storageQuota, fileCount };
}
