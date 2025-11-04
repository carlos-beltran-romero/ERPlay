/**
 * Módulo de cliente HTTP
 * Gestiona autenticación JWT, refresh tokens y manejo de errores centralizado
 * @module services/http
 */

import { env } from "../config/env";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const API_URL = env.API_URL;

/**
 * Error de API con contexto HTTP
 * Incluye status code y respuesta del servidor
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
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
 * Resuelve path relativo a URL absoluta
 * @param path - Path de API (ej: '/api/auth/login')
 * @returns URL completa con API_URL configurado
 */
function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) return `${API_URL}/${path}`;
  return `${API_URL}${path}`;
}

/**
 * Añade header Authorization con Bearer token
 * @param init - RequestInit base
 * @param explicitToken - Token opcional (default: usa getAccessToken())
 * @returns RequestInit con header Authorization
 */
function withAuth(init: RequestInit, explicitToken?: string): RequestInit {
  const headers = new Headers(init.headers ?? {});
  const token = explicitToken ?? getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Parsea JSON de respuesta con manejo defensivo
 * @param res - Response de fetch
 * @returns Objeto parseado o undefined si no es JSON válido
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
 * Automáticamente limpia tokens si el refresh falla
 *
 * @returns Nuevo access token o null si el refresh expiró
 * @remarks
 * - Llamado automáticamente por apiRequest ante 401/403
 * - Usa promise singleton para evitar múltiples refreshes concurrentes
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(resolveUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });

  const body = await safeParseJson(res);
  if (!res.ok || typeof (body as any)?.accessToken !== "string") {
    clearTokens();
    return null;
  }

  const access = String((body as any).accessToken);
  const refresh = (body as any).refreshToken
    ? String((body as any).refreshToken)
    : undefined;
  setTokens(access, refresh);
  return access;
}

/**
 * Gestiona refresh de token con singleton pattern
 * Evita race conditions con múltiples llamadas concurrentes
 *
 * @returns Promise del access token renovado
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
 * Reintenta automáticamente si detecta 401/403 y tiene refresh token
 *
 * @param path - Path de la API
 * @param init - Opciones extendidas (auth, json, fallbackError)
 * @returns Response crudo (usar apiJson para parseado automático)
 * @remarks
 * - auth=true: Añade header Authorization automáticamente
 * - json: Serializa body y añade Content-Type: application/json
 * - Ante 401/403: Intenta refresh + reintento con nuevo token
 */
export async function apiRequest(
  path: string,
  init: ApiRequestInit = {}
): Promise<Response> {
  const { auth = false, json, fallbackError, ...rest } = init;
  const url = resolveUrl(path);
  const base: RequestInit = { ...rest };

  if (json !== undefined) {
    base.body = JSON.stringify(json);
    const headers = new Headers(base.headers ?? {});
    if (!headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
    base.headers = headers;
  } else if (rest.body) {
    base.body = rest.body;
  }

  const attempt = async (tokenOverride?: string) => {
    const prepared = auth
      ? withAuth(base, tokenOverride)
      : { ...base, headers: new Headers(base.headers ?? {}) };
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

/**
 * Cliente HTTP con parsing automático de JSON
 * Lanza ApiError si el servidor devuelve error
 *
 * @param path - Path de la API
 * @param init - Opciones extendidas
 * @returns Body parseado como tipo T
 * @throws {ApiError} Si res.ok = false, con mensaje del servidor o fallback
 * @remarks
 * - Extrae campo 'error' del body como mensaje preferencial
 * - fallbackError: Usado si el servidor no envía 'error'
 */
export async function apiJson<T>(
  path: string,
  init: ApiRequestInit = {}
): Promise<T> {
  const res = await apiRequest(path, init);
  const body = await safeParseJson(res);

  if (!res.ok) {
    const fallback =
      (res as any).fallbackError ?? init.fallbackError ?? `Error ${res.status}`;
    const message =
      typeof (body as any)?.error === "string" ? (body as any).error : fallback;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

/**
 * Alias de apiRequest con auth=true por defecto
 * @deprecated Usar apiRequest({ auth: true }) directamente
 */
export async function fetchAuth(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return apiRequest(path, { ...(init ?? {}), auth: true });
}
