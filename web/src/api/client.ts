import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types';

// withCredentials: true is the one line whose absence makes every request
// 401 — the session cookie is never sent otherwise, even same-origin in dev
// (via the Vite proxy) or same-site in prod (drive. -> api.yashsachan.com).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

function readCsrfCookie(): string | undefined {
  const match = document.cookie.match(/(?:^|; )drive_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : undefined;
}

// Every mutating request needs the double-submit CSRF header — the token
// itself lives in a non-httpOnly cookie set at login specifically so this
// can read it back. See server/src/auth/csrf.ts for the server side.
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = readCsrfCookie();
    if (token) config.headers.set('X-CSRF-Token', token);
  }
  return config;
});

export type ApiError = AxiosError<ApiErrorBody>;

export function apiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiErrorBody | undefined)?.error?.code;
  }
  return undefined;
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (err.code === 'ECONNABORTED') return 'Request timed out.';
    if (!err.response) return 'Could not reach the server.';
  }
  return 'Something went wrong. Please try again.';
}
