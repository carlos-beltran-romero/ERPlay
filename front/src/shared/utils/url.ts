/**
 * Utilidades para conversión de URLs
 * @module shared/utils/url
 */

import { env } from '../../config/env';

/**
 * Convierte rutas relativas del backend a URLs absolutas
 * @param path - Path relativo (ej: '/uploads/diagram.png')
 * @returns URL absoluta o null si path es vacío
 * @remarks
 * - Detecta URLs absolutas (http/https) y las retorna sin cambios
 * - Elimina trailing slash de API_URL y sufijo /api
 * - Normaliza múltiples slashes consecutivas
 */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const base = env.API_URL.replace(/\/+$/, '').replace(/\/api$/i, '');
  const rel = `/${String(path)}`.replace(/\/{2,}/g, '/');
  return `${base}${rel}`;
}