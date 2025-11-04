/**
 * Utilidades de formateo de texto
 * @module shared/utils/text
 */

/**
 * Convierte índice numérico a letra (A, B, C...)
 * @param index - Índice 0-based (0=A, 1=B, etc.)
 * @returns Letra mayúscula o '—' si índice inválido
 * @remarks Usado para etiquetas de opciones en preguntas (opción A, B, C...)
 */
export function letterFromIndex(index?: number | null): string {
  if (index == null || Number.isNaN(index) || index < 0) return '—';
  return String.fromCharCode(65 + index);
}