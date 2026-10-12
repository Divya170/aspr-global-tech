// Admin API client. Wraps the shared `request` helper with:
//  - the session's CSRF token on every write (kept in memory only, never in storage);
//  - one transparent retry when the CSRF token went stale (e.g. after signing in on another tab);
//  - a global 401 handler that sends the user to the sign-in page;
//  - helpers for file downloads (CSV exports, attachments) and uploads with progress.
import { ApiError, request } from '@/lib/client';
import type { MeResponse } from './types';

export { ApiError };

const BASE = '/api/admin';
let csrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string | null) { csrfToken = token; }
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

type Query = Record<string, string | number | boolean | null | undefined>;

/** `{ a: 1, b: '' }` → `?a=1` (empty values are dropped). */
export function qs(params: Query = {}): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
}

const isAuthRoute = (path: string) => /^\/auth\/(login|forgot|reset|me)\b/.test(path);

async function refreshCsrf(): Promise<boolean> {
  try {
    const me = await request<MeResponse>(`${BASE}/auth/me`);
    csrfToken = me.csrfToken;
    return true;
  } catch {
    return false;
  }
}

async function call<T>(method: string, path: string, json?: unknown, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  try {
    return await request<T>(BASE + path, { method, json, headers });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401 && !isAuthRoute(path)) unauthorizedHandler?.();
      if (e.status === 403 && method !== 'GET' && !retried && /session token/i.test(e.message) && (await refreshCsrf())) {
        return call<T>(method, path, json, true);
      }
    }
    throw e;
  }
}

export const adminApi = {
  get: <T>(path: string, query?: Query) => call<T>('GET', path + qs(query)),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => call<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => call<T>('PUT', path, body),
  del: <T>(path: string) => call<T>('DELETE', path),
};

function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get('Content-Disposition') || '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) { try { return decodeURIComponent(star[1]); } catch { /* fall through */ } }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

/** Downloads an authenticated file (cookie session) and saves it through a temporary object URL. */
export async function download(path: string, fallbackName = 'download'): Promise<void> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.();
    let message = `Download failed (${res.status})`;
    try { const body = await res.json(); if (body?.message) message = String(body.message); } catch { /* not JSON */ }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFrom(res, fallbackName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface UploadHandle<T> { promise: Promise<T>; abort: () => void }

/** Multipart upload of one file (field `file`) with progress, via XMLHttpRequest. */
export function uploadFile<T>(path: string, file: File, onProgress?: (fraction: number) => void): UploadHandle<T> {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open('POST', BASE + path);
    xhr.withCredentials = true;
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let data: { message?: string | string[]; errors?: Record<string, string> } | null = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { data = null; }
      if (xhr.status >= 200 && xhr.status < 300) { resolve(data as T); return; }
      if (xhr.status === 401) unauthorizedHandler?.();
      const fieldMsg = data?.errors ? Object.values(data.errors)[0] : '';
      const msg = fieldMsg || (Array.isArray(data?.message) ? data?.message[0] : data?.message) || (xhr.status === 413 ? 'That file is too large.' : `Upload failed (${xhr.status})`);
      reject(new ApiError(String(msg), xhr.status, data || undefined));
    };
    xhr.onerror = () => reject(new ApiError("We couldn't reach the server. Check your connection and try again.", 0));
    xhr.onabort = () => reject(new ApiError('Upload cancelled.', 0));
    const form = new FormData();
    form.append('file', file, file.name);
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}

/** A readable message for any thrown value. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ApiError) {
    if (e.status === 403 && !/session token/i.test(e.message)) return e.message || "You don't have access to this.";
    return e.message || fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
