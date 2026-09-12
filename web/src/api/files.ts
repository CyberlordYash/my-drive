import { api } from './client';
import type { FileDTO, Page, ShareDTO, StorageUsage } from '../types';

export type ListView = 'mine' | 'shared' | 'trash' | 'starred';

export interface ListParams {
  parentId?: string;
  kind?: 'file' | 'folder';
  sort?: 'name' | 'updatedAt' | 'size';
  order?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export async function listFiles(params: ListParams = {}): Promise<Page<FileDTO>> {
  const { data } = await api.get<Page<FileDTO>>('/api/files', { params });
  return data;
}

export async function listTrash(cursor?: string): Promise<Page<FileDTO>> {
  const { data } = await api.get<Page<FileDTO>>('/api/files/trash', { params: { cursor } });
  return data;
}

export async function listSharedWithMe(cursor?: string): Promise<Page<FileDTO>> {
  const { data } = await api.get<Page<FileDTO>>('/api/files/shared-with-me', { params: { cursor } });
  return data;
}

export async function listStarred(cursor?: string): Promise<Page<FileDTO>> {
  const { data } = await api.get<Page<FileDTO>>('/api/files/starred', { params: { cursor } });
  return data;
}

export async function searchFiles(q: string, scope: 'all' | 'owned' | 'shared' = 'all'): Promise<Page<FileDTO>> {
  const { data } = await api.get<Page<FileDTO>>('/api/files/search', { params: { q, scope } });
  return data;
}

export async function getFile(id: string): Promise<FileDTO> {
  const { data } = await api.get<FileDTO>(`/api/files/${id}`);
  return data;
}

export async function createFolder(name: string, parentId?: string): Promise<FileDTO> {
  const { data } = await api.post<FileDTO>('/api/files/folders', { name, parentId });
  return data;
}

export async function uploadFiles(
  files: File[],
  parentId: string | undefined,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<FileDTO[]> {
  const form = new FormData();
  for (const f of files) form.append('file', f);
  const { data } = await api.post<FileDTO[]>('/api/files/upload', form, {
    params: parentId ? { parentId } : undefined,
    signal,
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(evt.loaded / evt.total);
    },
  });
  return data;
}

export async function renameFile(id: string, name: string): Promise<FileDTO> {
  const { data } = await api.patch<FileDTO>(`/api/files/${id}`, { name });
  return data;
}

export async function moveFile(id: string, parentId: string | null): Promise<FileDTO> {
  const { data } = await api.patch<FileDTO>(`/api/files/${id}`, { parentId });
  return data;
}

export async function copyFile(id: string): Promise<FileDTO> {
  const { data } = await api.post<FileDTO>(`/api/files/${id}/copy`);
  return data;
}

export async function toggleStar(id: string): Promise<FileDTO> {
  const { data } = await api.post<FileDTO>(`/api/files/${id}/star`);
  return data;
}

export async function trashFile(id: string): Promise<void> {
  await api.delete(`/api/files/${id}`);
}

export async function restoreFile(id: string): Promise<FileDTO> {
  const { data } = await api.post<FileDTO>(`/api/files/${id}/restore`);
  return data;
}

export async function permanentlyDeleteFile(id: string): Promise<void> {
  await api.delete(`/api/files/${id}`, { params: { permanent: true } });
}

export async function emptyTrash(): Promise<{ deleted: number }> {
  const { data } = await api.post<{ deleted: number }>('/api/files/trash/empty');
  return data;
}

export function downloadUrl(id: string): string {
  return `${api.defaults.baseURL ?? ''}/api/files/${id}/download`;
}

export function contentUrl(id: string, inline = true): string {
  return `${api.defaults.baseURL ?? ''}/api/files/${id}/content?inline=${inline ? '1' : '0'}`;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const { data } = await api.get<StorageUsage>('/api/files/storage');
  return data;
}

// --- Sharing ---

export async function listShares(fileId: string): Promise<ShareDTO[]> {
  const { data } = await api.get<ShareDTO[]>(`/api/files/${fileId}/shares`);
  return data;
}

export async function createShare(
  fileId: string,
  email: string,
  role: 'viewer' | 'editor',
): Promise<ShareDTO> {
  const { data } = await api.post<ShareDTO>(`/api/files/${fileId}/shares`, { email, role });
  return data;
}

export async function updateShareRole(
  fileId: string,
  userId: string,
  role: 'viewer' | 'editor',
): Promise<ShareDTO> {
  const { data } = await api.patch<ShareDTO>(`/api/files/${fileId}/shares/${userId}`, { role });
  return data;
}

export async function revokeShare(fileId: string, userId: string): Promise<void> {
  await api.delete(`/api/files/${fileId}/shares/${userId}`);
}

export async function createPublicLink(
  fileId: string,
): Promise<{ url: string; token: string; expiresAt: string | null }> {
  const { data } = await api.post(`/api/files/${fileId}/link`, {});
  return data;
}

export async function revokePublicLink(fileId: string): Promise<void> {
  await api.delete(`/api/files/${fileId}/link`);
}
