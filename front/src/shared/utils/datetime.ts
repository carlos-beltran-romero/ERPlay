/**
 * Utilidades para formatear fechas y duraciones en la UI
 * @module front/shared/utils/datetime
 */

const defaultLocale = typeof navigator !== 'undefined' ? navigator.language : 'es-ES';

/**
 * Formatea fecha ISO a formato local
 * @param iso - Fecha en formato ISO-8601
 * @param options - Opciones de Intl.DateTimeFormat
 * @returns Fecha formateada o '—' si es inválida
 */
export function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(defaultLocale, options);
}

/**
 * Formatea fecha y hora ISO a formato local
 * @param iso - Fecha en formato ISO-8601
 * @param options - Opciones de Intl.DateTimeFormat
 * @returns Fecha y hora formateadas o '—' si es inválida
 */
export function formatDateTime(
  iso?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(defaultLocale, options);
}

/**
 * Formatea duración en segundos a formato legible
 * @param seconds - Duración en segundos
 * @returns Formato 'Xh Ym Zs', 'Xm Ys' o 'Xs' según magnitud
 * @remarks Omite horas si son 0, omite minutos si son 0
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Formatea segundos con 1 decimal
 * @param seconds - Duración en segundos
 * @returns Formato 'X.X s'
 * @remarks Usado para tiempos cortos por pregunta
 */
export function formatDecimalSeconds(seconds?: number | null): string {
  if (seconds == null) return '—';
  const value = Math.max(0, seconds);
  return `${value.toFixed(1)} s`;
}

/**
 * Formatea porcentaje redondeado
 * @param value - Valor entre 0-100
 * @returns Formato 'X%'
 */
export function formatPercent(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}