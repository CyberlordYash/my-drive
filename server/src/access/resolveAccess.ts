import type { Types } from 'mongoose';
import { FileNode, type FileNodeDoc } from '../db/models/FileNode.js';
import { AppError } from '../lib/AppError.js';

export type AccessRole = 'owner' | 'editor' | 'viewer' | null;

/**
 * THE single authorization function for the whole app. Every file route
 * calls this before doing anything — no route is allowed to hand-roll its
 * own "is this mine" check. That is what prevents the classic take-home IDOR
 * bug where GET /api/files/:id happily serves someone else's file.
 *
 * Resolution order:
 *   1. Owner? -> 'owner'
 *   2. Direct share on this exact node? -> that share's role
 *   3. Share on ANY ancestor folder (cascading folder shares)? -> that role
 *   4. Otherwise -> null (caller should respond 404, never 403 — a file you
 *      can't see should not even reveal that it exists)
 */
export async function resolveAccess(
  userId: Types.ObjectId | string,
  node: FileNodeDoc,
): Promise<AccessRole> {
  const uid = userId.toString();

  if (node.ownerId.toString() === uid) return 'owner';

  const direct = node.sharedWith.find((s) => s.userId?.toString() === uid);
  if (direct) return direct.role as AccessRole;

  if (node.ancestorIds.length === 0) return null;

  // One indexed query: does ANY ancestor folder have this user in its ACL?
  // We fetch the specific share role from the nearest matching ancestor
  // (walking root-to-leaf order reversed so the closest share wins, matching
  // Drive's actual behavior where a more specific share can grant more).
  const ancestors = await FileNode.find(
    { _id: { $in: node.ancestorIds }, aclUserIds: uid },
    { sharedWith: 1, ownerId: 1, ancestorIds: 1 },
  ).lean();

  if (ancestors.length === 0) return null;

  // ancestorIds is stored root-first; check closest-to-leaf first so the
  // most specific (innermost) folder share wins if a user is shared on
  // multiple ancestor levels with different roles.
  const byId = new Map(ancestors.map((a) => [a._id.toString(), a]));
  for (let i = node.ancestorIds.length - 1; i >= 0; i -= 1) {
    const ancestorId = node.ancestorIds[i]?.toString();
    if (!ancestorId) continue;
    const ancestor = byId.get(ancestorId);
    if (!ancestor) continue;
    const share = ancestor.sharedWith.find((s) => s.userId?.toString() === uid);
    if (share) return share.role as AccessRole;
  }

  return null;
}

/**
 * Throws-if-insufficient helper for the common "assert and get role"
 * pattern. Deliberately distinguishes two failure cases with different
 * status codes:
 *   - No access at all (role === null): 404. The caller shouldn't even
 *     learn the file exists.
 *   - SOME access but below the required rank (e.g. a viewer hitting an
 *     editor-only action): 403. They can already see the file exists —
 *     hiding that fact now would just be confusing, not more secure.
 */
export async function assertAccess(
  userId: Types.ObjectId | string,
  node: FileNodeDoc,
  minimum: 'viewer' | 'editor' | 'owner',
): Promise<AccessRole> {
  const role = await resolveAccess(userId, node);
  if (!role) {
    throw AppError.notFound('FILE_NOT_FOUND', 'File not found');
  }
  const rank = { viewer: 0, editor: 1, owner: 2 } as const;
  if (rank[role] < rank[minimum]) {
    throw AppError.forbidden('You do not have permission to perform this action', 'INSUFFICIENT_ROLE');
  }
  return role;
}
