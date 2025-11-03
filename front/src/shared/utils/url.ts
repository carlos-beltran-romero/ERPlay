import { env } from '../../config/env';

/**
 * Convierte rutas relativas del backend a URLs absolutas.
 */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const base = env.API_URL.replace(/\/+$/, '').replace(/\/api$/i, '');
  const rel = `/${String(path)}`.replace(/\/{2,}/g, '/');
  return `${base}${rel}`;
}
