// Hand-maintained mirror of the server's DTOs (see server/src/modules/*/dto.ts).
// A shared package was deliberately avoided: web/ and server/ deploy to two
// different hosts (Vercel and Render) each building from its own
// subdirectory, and a workspace package would force both builds into
// workspace-aware root resolution for a handful of small types — not worth
// the deploy risk. Keep these in sync by hand; there are only a few.

export type AccessRole = 'owner' | 'editor' | 'viewer' | null;

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  storageUsed: number;
  storageQuota: number;
}

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
  breadcrumbs?: Array<{ id: string; name: string }>;
}

export interface ShareDTO {
  id: string;
  userId: string | null;
  email: string;
  role: 'viewer' | 'editor';
  sharedAt: string;
}

export interface Page<T> {
  data: T[];
  page: { limit: number; nextCursor?: string };
}

export interface StorageUsage {
  used: number;
  quota: number;
  fileCount: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}
