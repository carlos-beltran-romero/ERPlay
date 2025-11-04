/**
 * Módulo de servicios de revisión
 * Gestiona contadores de elementos pendientes para supervisores
 * @module services/review
 */

import { apiJson } from "./http";

/**
 * Obtiene contador de preguntas pendientes de revisión
 * @returns Número total de preguntas con status=PENDING
 * @remarks Silencia errores y retorna 0 si el endpoint falla
 */
export async function getPendingStudentQuestionsCount(): Promise<number> {
  try {
    const data = await apiJson<any>("/api/questions/pending/count", {
      auth: true,
      fallbackError: "No disponible",
    });
    return Number(data?.count ?? 0);
  } catch {
    return 0;
  }
}
