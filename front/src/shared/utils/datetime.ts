/**
 * Utilidades para formatear fechas y duraciones en la UI.
 */

const defaultLocale = typeof navigator !== 'undefined' ? navigator.language : 'es-ES';

export function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(defaultLocale, options);
}

export function formatDateTime(iso?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(defaultLocale, options);
}

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

export function formatDecimalSeconds(seconds?: number | null): string {
  if (seconds == null) return '—';
  const value = Math.max(0, seconds);
  return `${value.toFixed(1)} s`;
}

export function formatPercent(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}
