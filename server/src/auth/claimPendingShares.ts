import type { UserDoc } from '../db/models/User.js';
import { FileNode } from '../db/models/FileNode.js';

/**
 * When a file is shared with an email address that hasn't signed up yet, the
 * share is stored with `userId: null` (see modules/shares/service.ts). This
 * runs once on a user's first login and "claims" every such pending share by
 * filling in userId and pushing it into the denormalized aclUserIds array —
 * which is what actually grants access (see access/resolveAccess.ts).
 *
 * Without this step, sharing with someone who hasn't logged in yet would
 * silently do nothing once they do log in.
 */
export async function claimPendingShares(user: UserDoc): Promise<void> {
  await FileNode.updateMany(
    { 'sharedWith.email': user.email, 'sharedWith.userId': null },
    {
      $set: { 'sharedWith.$[elem].userId': user._id },
      $addToSet: { aclUserIds: user._id },
    },
    { arrayFilters: [{ 'elem.email': user.email, 'elem.userId': null }] },
  );
}
