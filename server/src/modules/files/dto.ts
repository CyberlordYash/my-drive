import type { FileNodeDoc } from '../../db/models/FileNode.js';
import type { AccessRole } from '../../access/resolveAccess.js';

export interface FileDTO {
  id: string;
  kind: 'file' | 'folder';
  name: string;
  ownerId: string;
  parentId: string | null;
  size?: number;
  mimeType?: string;
  isStarred: boolean;
  isTrashed: boolean;
  hasPublicLink: boolean;
  myRole: AccessRole;
  createdAt: string;
  updatedAt: string;
}

export function toFileDTO(node: FileNodeDoc, myRole: AccessRole): FileDTO {
  return {
    id: node._id.toString(),
    kind: node.kind as 'file' | 'folder',
    name: node.name,
    ownerId: node.ownerId.toString(),
    parentId: node.parentId ? node.parentId.toString() : null,
    size: node.size ?? undefined,
    mimeType: node.mimeType ?? undefined,
    isStarred: node.isStarred,
    isTrashed: node.isTrashed,
    hasPublicLink: Boolean(node.publicLink),
    myRole,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}
