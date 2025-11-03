/** Devuelve la letra asociada al índice (A, B, C...). */
export function letterFromIndex(index?: number | null): string {
  if (index == null || Number.isNaN(index) || index < 0) return '—';
  return String.fromCharCode(65 + index);
}
