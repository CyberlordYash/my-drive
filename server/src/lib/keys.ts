import { randomUUID } from 'node:crypto';
import path from 'node:path';

/**
 * Storage keys are always server-generated, never derived from the
 * client-supplied filename. This closes the path-traversal / collision /
 * weird-unicode-filename class of bugs at the source, rather than trying to
 * sanitize a hostile filename into a safe path.
 */
export function buildStorageKey(ownerId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `u/${ownerId}/${randomUUID()}${ext}`;
}

export function buildThumbnailKey(storageKey: string): string {
  return `${storageKey}.thumb.webp`;
}
