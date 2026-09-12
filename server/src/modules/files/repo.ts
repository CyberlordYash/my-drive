import { Types } from 'mongoose';
import { FileNode, type FileNodeDoc } from '../../db/models/FileNode.js';

export async function siblingNameExists(
  ownerId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  nameLower: string,
  excludeId?: Types.ObjectId,
): Promise<boolean> {
  const filter: Record<string, unknown> = {
    ownerId,
    parentId,
    nameLower: nameLower.toLowerCase(),
    isTrashed: false,
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return (await FileNode.exists(filter)) !== null;
}

/** Builds the ancestorIds array for a new child given its parent doc (or null for root). */
export function buildAncestorIds(parent: FileNodeDoc | null): Types.ObjectId[] {
  if (!parent) return [];
  return [...parent.ancestorIds, parent._id];
}

/** All non-trashed descendant ids of a folder, via the materialized ancestorIds path. */
export async function findDescendantIds(folderId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const descendants = await FileNode.find({ ancestorIds: folderId }, { _id: 1 }).lean();
  return descendants.map((d) => d._id);
}

export async function getBreadcrumbTrail(
  node: FileNodeDoc,
): Promise<Array<{ id: string; name: string }>> {
  if (node.ancestorIds.length === 0) return [];
  const ancestors = await FileNode.find(
    { _id: { $in: node.ancestorIds } },
    { name: 1 },
  ).lean();
  const byId = new Map(ancestors.map((a) => [a._id.toString(), a.name]));
  return node.ancestorIds
    .map((id) => ({ id: id.toString(), name: byId.get(id.toString()) ?? '(unknown)' }))
    .filter((a) => a.name !== '(unknown)' || true);
}
