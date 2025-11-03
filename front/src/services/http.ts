import { env } from '../config/env';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const API_URL = env.API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiRequestInit = RequestInit & {
  /** Indica si debe enviarse Authorization automáticamente. */
  auth?: boolean;
  /** Permite serializar automáticamente payloads JSON. */
  json?: unknown;
  /** Mensaje genérico usado si la API no devuelve `error`. */
  fallbackError?: string;
};

let refreshingPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return `${API_URL}/${path}`;
  return `${API_URL}${path}`;
}

function withAuth(init: RequestInit, explicitToken?: string): RequestInit {
  const headers = new Headers(init.headers ?? {});
  const token = explicitToken ?? getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

async function safeParseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(resolveUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });

  const body = await safeParseJson(res);
  if (!res.ok || typeof (body as any)?.accessToken !== 'string') {
    clearTokens();
    return null;
  }

  const access = String((body as any).accessToken);
  const refresh = (body as any).refreshToken ? String((body as any).refreshToken) : undefined;
  setTokens(access, refresh);
  return access;
}

async function ensureFreshToken(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = refreshAccessToken().finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

export async function apiRequest(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { auth = false, json, fallbackError, ...rest } = init;
  const url = resolveUrl(path);
  const base: RequestInit = { ...rest };

  if (json !== undefined) {
    base.body = JSON.stringify(json);
    const headers = new Headers(base.headers ?? {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    base.headers = headers;
  } else if (rest.body) {
    base.body = rest.body;
  }

  const attempt = async (tokenOverride?: string) => {
    const prepared = auth ? withAuth(base, tokenOverride) : { ...base, headers: new Headers(base.headers ?? {}) };
    return fetch(url, prepared);
  };

  const first = await attempt();
  if (!auth || (first.status !== 401 && first.status !== 403)) {
    (first as any).fallbackError = fallbackError;
    return first;
  }

  const refreshed = await ensureFreshToken();
  if (!refreshed) {
    (first as any).fallbackError = fallbackError;
    return first;
  }

  const second = await attempt(refreshed);
  (second as any).fallbackError = fallbackError;
  return second;
}

export async function apiJson<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const res = await apiRequest(path, init);
  const body = await safeParseJson(res);

  if (!res.ok) {
    const fallback = (res as any).fallbackError ?? init.fallbackError ?? `Error ${res.status}`;
    const message = typeof (body as any)?.error === 'string' ? (body as any).error : fallback;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export async function fetchAuth(path: string, init?: RequestInit): Promise<Response> {
  return apiRequest(path, { ...(init ?? {}), auth: true });
}
