import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { FileNode } from '../../db/models/FileNode.js';
import { User, type UserDoc } from '../../db/models/User.js';
import { ActivityLog } from '../../db/models/ActivityLog.js';
import { AppError } from '../../lib/AppError.js';
import { assertAccess } from '../../access/resolveAccess.js';

async function loadOwnedNode(user: UserDoc, id: string) {
  const node = await FileNode.findById(id);
  if (!node) throw AppError.notFound('FILE_NOT_FOUND', 'File not found');
  // Only the owner can manage sharing — an editor cannot re-share, which is
  // deliberate: it stops a shared collaborator from cascading access to
  // people the owner never chose to trust.
  await assertAccess(user._id, node, 'owner');
  return node;
}

export async function listShares(user: UserDoc, fileId: string) {
  const node = await loadOwnedNode(user, fileId);
  return node.sharedWith;
}

export async function createShare(
  user: UserDoc,
  fileId: string,
  email: string,
  role: 'viewer' | 'editor',
) {
  const node = await loadOwnedNode(user, fileId);
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === user.email) {
    throw AppError.badRequest('CANNOT_SHARE_WITH_SELF', 'You cannot share a file with yourself');
  }
  if (node.sharedWith.some((s) => s.email === normalizedEmail)) {
    throw AppError.conflict('ALREADY_SHARED', 'This file is already shared with that person');
  }

  const targetUser = await User.findOne({ email: normalizedEmail });

  node.sharedWith.push({
    userId: targetUser?._id ?? null,
    email: normalizedEmail,
    role,
    sharedAt: new Date(),
    sharedBy: user._id,
  } as never);
  if (targetUser) node.aclUserIds.push(targetUser._id);
  await node.save();

  void ActivityLog.create({
    actorId: user._id,
    fileId: node._id,
    action: 'share',
    meta: { email: normalizedEmail, role },
  }).catch(() => {});

  // Safe non-null assertion: we just pushed this element above.
  return node.sharedWith[node.sharedWith.length - 1]!;
}

export async function updateShareRole(
  user: UserDoc,
  fileId: string,
  shareUserId: string,
  role: 'viewer' | 'editor',
) {
  const node = await loadOwnedNode(user, fileId);
  const share = node.sharedWith.find((s) => s.userId?.toString() === shareUserId);
  if (!share) throw AppError.notFound('SHARE_NOT_FOUND', 'Share not found');
  share.role = role;
  await node.save();
  return share;
}

export async function revokeShare(user: UserDoc, fileId: string, shareUserId: string) {
  const node = await loadOwnedNode(user, fileId);
  const share = node.sharedWith.find((s) => s.userId?.toString() === shareUserId);
  if (!share) throw AppError.notFound('SHARE_NOT_FOUND', 'Share not found');

  node.sharedWith.pull({ _id: share._id });
  node.aclUserIds = node.aclUserIds.filter((id) => id.toString() !== shareUserId);
  await node.save();

  void ActivityLog.create({ actorId: user._id, fileId: node._id, action: 'unshare' }).catch(() => {});
}

export async function createPublicLink(user: UserDoc, fileId: string, expiresInDays?: number) {
  const node = await loadOwnedNode(user, fileId);
  const link = {
    token: randomBytes(24).toString('base64url'),
    role: 'viewer' as const,
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    createdAt: new Date(),
  };
  node.publicLink = link as never;
  await node.save();
  return link;
}

export async function revokePublicLink(user: UserDoc, fileId: string) {
  const node = await loadOwnedNode(user, fileId);
  node.publicLink = null;
  await node.save();
}

export async function getByPublicToken(token: string) {
  const node = await FileNode.findOne({ 'publicLink.token': token, isTrashed: false });
  if (!node || !node.publicLink) throw AppError.notFound('LINK_NOT_FOUND', 'Link not found');
  if (node.publicLink.expiresAt && node.publicLink.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'LINK_EXPIRED', 'This link has expired');
  }
  return node;
}

export function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
