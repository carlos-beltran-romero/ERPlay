// src/services/http.ts
const API_URL = import.meta.env.VITE_API_URL as string;

let refreshingPromise: Promise<string> | null = null;

function getAccessToken() {
  return localStorage.getItem('accessToken') ?? '';
}
function getRefreshToken() {
  return localStorage.getItem('refreshToken') ?? '';
}
function setTokens(access: string, refresh?: string) {
  localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
}
export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/** Llama al endpoint de refresh y guarda tokens */
async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo refrescar sesión');

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

/**
 * fetchAuth: añade Authorization automáticamente y
 * si recibe 401/403 intenta refrescar y reintenta UNA vez.
 */
export async function fetchAuth(input: string, init: RequestInit = {}): Promise<Response> {
  // 1) primer intento con el access token actual
  const first = await fetch(input, withAuth(init));
  if (first.status !== 401 && first.status !== 403) return first;

  // 2) si ha fallado por expirar, sincronizamos el refresh
  if (!refreshingPromise) refreshingPromise = doRefresh().finally(() => (refreshingPromise = null));
  try {
    await refreshingPromise;
  } catch {
    // refresh falló → limpiamos sesión y devolvemos el 401 original
    clearTokens();
    return first;
  }

  // 3) reintento con token recién refrescado
  return fetch(input, withAuth(init));
}

/** Adjunta Authorization (sin romper headers existentes) */
function withAuth(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // importante: no forzamos Content-Type (por si es FormData)
  return { ...init, headers };
}

export { API_URL, setTokens, getAccessToken, getRefreshToken };
