/**
 * Módulo de cliente HTTP
 * Gestiona autenticación JWT, refresh tokens y manejo de errores centralizado
 * Compatible con:
 *  - Docker + Nginx (VITE_API_URL=/api)
 *  - Local (VITE_API_URL=http://localhost:3000) o vacío si usas proxy de Vite
 * Evita el doble prefijo /api/api cuando el path ya empieza por /api
 * @module front/services/http
 */

import { env } from '../config/env';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Puede ser '', '/api' o 'http://host:3000'
const API_URL_BASE = (env.API_URL ?? '').trim();

export const API_URL = API_URL_BASE;

/**
 * Error de API con contexto HTTP
 * Incluye status code y respuesta del servidor
 */
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

/** Opciones extendidas de fetch con helpers de autenticación */
export type ApiRequestInit = RequestInit & {
  auth?: boolean;
  json?: unknown;
  fallbackError?: string;
};

let refreshingPromise: Promise<string | null> | null = null;

function toNetworkApiError(error: unknown): ApiError {
  const cause = (error as any)?.cause ?? error;
  const code =
    typeof (cause as any)?.code === 'string'
      ? (cause as any).code
      : typeof (cause as any)?.errno === 'string'
      ? (cause as any).errno
      : undefined;
  const address = typeof (cause as any)?.address === 'string' ? (cause as any).address : undefined;
  const port = typeof (cause as any)?.port === 'number' ? (cause as any).port : undefined;

  const connectionDetails = code === 'ECONNREFUSED' && address && port ? `${address}:${port}` : undefined;
  const detailsSuffix = connectionDetails ? ` (${connectionDetails})` : '';

  const message =
    code === 'ECONNREFUSED'
      ? `No se pudo conectar con el servidor${detailsSuffix}. Verifica que la API y la base de datos estén en ejecución.`
      : 'Se produjo un error de red al comunicarse con el servidor.';

  const networkError = new ApiError(message, 0, undefined);
  (networkError as any).cause = error;
  return networkError;
}

async function runWithNetworkGuard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toNetworkApiError(error);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Almacena tokens JWT en localStorage
 * @param access - Access token (JWT con TTL corto, típicamente 15m)
 * @param refresh - Refresh token opcional (TTL largo, típicamente 7d)
 */
export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

/**
 * Limpia tokens de localStorage
 * Usado en logout y cuando refresh falla
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Resuelve path relativo a URL absoluta SIN duplicar /api
 * Reglas:
 *  - Si path es absoluta (http/https), se devuelve tal cual.
 *  - Si API_URL es http(s), se antepone (host) + path.
 *  - Si API_URL es relativo ('', '/api'), y el path ya empieza por ese prefijo, se deja como está.
 *  - En otro caso, se antepone el prefijo.
 */
function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  // Normaliza path a que empiece por /
  const rel = path.startsWith('/') ? path : `/${path}`;

  // ¿Base absoluta?
  const baseIsHttp = /^https?:\/\//i.test(API_URL_BASE);
  if (baseIsHttp) {
    const base = API_URL_BASE.replace(/\/+$/, ''); // sin barra final
    return `${base}${rel}`;
  }

  // Base relativa: '', '/api', '/algo'
  const base = API_URL_BASE.replace(/\/+$/, ''); // '', '/api', '/algo'
  if (!base) return rel; // origen actual

  // Evita duplicar prefijo: si rel ya empieza por base ('/api/...'), devuélvelo tal cual
  if (rel === base || rel.startsWith(`${base}/`)) {
    return rel;
  }

  return `${base}${rel}`;
}

/**
 * Añade header Authorization con Bearer token
 */
function withAuth(init: RequestInit, explicitToken?: string): RequestInit {
  const headers = new Headers(init.headers ?? {});
  const token = explicitToken ?? getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Parsea JSON de respuesta con manejo defensivo
 */
async function safeParseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Renueva access token usando refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await runWithNetworkGuard(() =>
    fetch(resolveUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    }),
  );

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

/**
 * Gestiona refresh de token con singleton pattern
 */
async function ensureFreshToken(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = refreshAccessToken().finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

/**
 * Cliente HTTP con auto-refresh de tokens
 */
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

  const first = await runWithNetworkGuard(() => attempt());
  if (!auth || (first.status !== 401 && first.status !== 403)) {
    (first as any).fallbackError = fallbackError;
    return first;
  }

  const refreshed = await runWithNetworkGuard(() => ensureFreshToken());
  if (!refreshed) {
    (first as any).fallbackError = fallbackError;
    return first;
  }

  const second = await runWithNetworkGuard(() => attempt(refreshed));
  (second as any).fallbackError = fallbackError;
  return second;
}

/**
 * Cliente HTTP con parsing automático de JSON
 */
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

/**
 * Alias de apiRequest con auth=true por defecto
 * @deprecated Usar apiRequest({ auth: true }) directamente
 */
export async function fetchAuth(path: string, init?: RequestInit): Promise<Response> {
  return apiRequest(path, { ...(init ?? {}), auth: true });
}
