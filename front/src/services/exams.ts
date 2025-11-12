/**
 * Módulo de servicios de exámenes
 * Gestiona inicio de tests tipo examen (modo evaluativo)
 * @module front/services/exams
 */

import { apiJson, API_URL } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

/** Pregunta de examen con opciones barajadas */
export type ExamQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  hint?: string;
};

/** Payload de inicio de examen con diagrama y preguntas */
export type ExamPayload = {
  diagram: { id: string; title: string; path: string };
  questions: ExamQuestion[];
};

/**
 * Inicia un nuevo examen aleatorio
 * Selecciona diagrama y preguntas al azar del banco aprobado
 * 
 * @param limit - Número máximo de preguntas (default: 10)
 * @returns Diagrama seleccionado y preguntas snapshot
 * @throws {Error} Si no hay tests disponibles con preguntas aprobadas
 * @remarks
 * - Elige diagrama aleatorio con ≥limit preguntas aprobadas
 * - Baraja preguntas y toma las primeras 'limit'
 * - correctIndex: Oculto hasta finalizar (backend no lo envía en modo exam)
 * - hint: Disponible durante el examen si el estudiante lo solicita
 * - Crea TestSession en estado 'in_progress'
 */
export async function startExam(limit = 10): Promise<ExamPayload> {
  const data = await apiJson<any>(`${API_URL}/api/exams/start?limit=${limit}`, {
    auth: true,
    fallbackError: 'No se pudo iniciar el examen',
  });

  return {
    ...data,
    diagram: { ...data.diagram, path: resolveAssetUrl(data?.diagram?.path) ?? '' },
  };
}