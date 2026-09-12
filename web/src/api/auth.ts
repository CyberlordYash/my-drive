import { api } from './client';
import type { UserDTO } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

// A real top-level navigation, not a fetch — OAuth requires the browser to
// actually leave the page and go to Google, then follow the 302 back.
export function googleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

export async function fetchMe(): Promise<UserDTO> {
  const { data } = await api.get<UserDTO>('/api/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}
