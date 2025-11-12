/**
 * Módulo de servicios del dashboard
 * Gestiona la consulta de actividad reciente del usuario
 * @module front/services/dashboard
 */

import { apiJson } from './http';

/** Actividad reciente: sesión de test completada o en progreso */
export type RecentActivitySession = {
  kind: 'session';
  id: string;
  createdAt: string;
  completedAt: string | null;
  mode: 'learning' | 'exam' | 'errors';
  diagramTitle: string | null;
  totalQuestions: number;
  correctCount: number;
  score: number | null;
  durationSec: number | null;
};

/** Actividad reciente: pregunta propuesta por el estudiante */
export type RecentActivityQuestion = {
  kind: 'question';
  id: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  title: string;
};

/** Actividad reciente: reclamación registrada */
export type RecentActivityClaim = {
  kind: 'claim';
  id: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  title: string;
};

/** Union type de todos los tipos de actividad */
export type RecentActivityItem =
  | RecentActivitySession
  | RecentActivityQuestion
  | RecentActivityClaim;

/**
 * Obtiene el historial reciente de actividad del usuario
 * Mezcla tests, preguntas propuestas y reclamaciones ordenadas por fecha
 * 
 * @param params - Opciones de paginación
 * @returns Array de actividades ordenadas descendentemente por fecha
 * @throws {Error} Si la respuesta del servidor no es un array válido
 * @remarks
 * - limit: Máximo de items a retornar (default: 8)
 * - offset: Items a saltar para paginación (default: 0)
 * - El servidor mezcla y ordena actividades de múltiples entidades
 * - title: Preview truncado del prompt/enunciado (max ~50 chars)
 */
export async function getRecentActivity(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 8;
  const offset = params?.offset ?? 0;

  const data = await apiJson<unknown>(`/api/dashboard/recent?limit=${limit}&offset=${offset}`, {
    auth: true,
    fallbackError: 'No se pudo cargar la actividad reciente',
  });

  if (!Array.isArray(data)) {
    throw new Error('Respuesta inesperada de la API');
  }
  return data as RecentActivityItem[];
}