import { store } from '../store';
import { logout } from '../store/authSlice';
import { translate } from '../i18n';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function headers(): Record<string, string> {
  const { auth, ui } = store.getState();
  // Accept-Language — server xatolarni shu tilda qaytaradi
  return { 'Accept-Language': ui.lang, ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) };
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const h = headers();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { ...h, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, translate(store.getState().ui.lang, 'err.network'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && h.Authorization) store.dispatch(logout());
    const lang = store.getState().ui.lang;
    throw new ApiError(res.status, typeof data.detail === 'string' ? data.detail : translate(lang, res.status >= 500 ? 'err.server' : 'err.generic'));
  }
  return res;
}

/** Typed JSON so'rov. */
export async function request<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const res = await send(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fayl yuklash (multipart/form-data). */
export async function upload<T>(path: string, file: Blob, filename = 'photo.jpg'): Promise<T> {
  const form = new FormData();
  form.append('file', file, filename);
  return (await (await send(path, { method: 'POST', body: form })).json()) as T;
}

/** Himoyalangan rasm: token bilan olib, brauzer xotirasida URL yasaydi (bir marta). */
const blobCache = new Map<string, Promise<string>>();
export function blobUrl(path: string): Promise<string> {
  let p = blobCache.get(path);
  if (!p) {
    p = send(path, { method: 'GET' }).then((r) => r.blob()).then((b) => URL.createObjectURL(b));
    p.catch(() => blobCache.delete(path));
    blobCache.set(path, p);
  }
  return p;
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
