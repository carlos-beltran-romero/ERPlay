/**
 * Módulo de servicios de diagramas
 * Gestiona CRUD de tests (diagramas ER con preguntas asociadas)
 * @module front/services/diagrams
 */

import { apiJson } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

/** Pregunta asociada a un diagrama */
export interface QuestionInput {
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
  status?: 'pending' | 'approved' | 'rejected';
  claimCount?: number;
}

/** Resumen de diagrama para listados */
export interface DiagramSummary {
  id: string;
  title: string;
  path: string;
  createdAt: string;
  questionsCount?: number;
}

/** Detalle completo de diagrama con preguntas */
export interface DiagramDetail {
  id: string;
  title: string;
  path: string;
  questions: QuestionInput[];
}

/**
 * Crea un nuevo diagrama con imagen y preguntas
 * Usa FormData para subir archivo sin forzar Content-Type
 * 
 * @param payload - Título, imagen y preguntas del test
 * @returns ID del diagrama creado
 * @throws {Error} Si la imagen excede 5MB o falta información requerida
 * @remarks
 * - imageFile: PNG/JPG, máximo 5MB
 * - questions: Mínimo 1 pregunta con ≥2 opciones
 * - correctIndex: 0-based, debe existir en options
 * - El servidor genera URL pública para la imagen
 */
export async function uploadDiagram(payload: {
  title: string;
  imageFile: File;
  questions: QuestionInput[];
}): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append('title', payload.title);
  fd.append('image', payload.imageFile);
  fd.append('questions', JSON.stringify(payload.questions));

  return apiJson('/api/diagrams', {
    method: 'POST',
    auth: true,
    body: fd,
    fallbackError: 'No se pudo subir el diagrama',
  });
}

/**
 * Lista todos los diagramas del sistema
 * Solo accesible para supervisores
 * 
 * @returns Array de diagramas ordenados por fecha descendente
 * @remarks
 * - path: URL pública resuelta con CDN/API_URL
 * - questionsCount: Incluye solo preguntas aprobadas
 */
export async function listDiagrams(): Promise<DiagramSummary[]> {
  const data = await apiJson<DiagramSummary[]>('/api/diagrams', {
    auth: true,
    fallbackError: 'No se pudo cargar la lista de tests',
  });
  return data.map((item) => ({ ...item, path: resolveAssetUrl(item.path) ?? '' }));
}

/**
 * Obtiene detalle completo de un diagrama
 * Incluye todas las preguntas (aprobadas y pendientes)
 * 
 * @param id - ID del diagrama
 * @returns Diagrama con imagen y preguntas completas
 * @throws {Error} 404 si el diagrama no existe
 * @remarks
 * - Solo supervisores pueden ver preguntas pendientes/rechazadas
 * - Estudiantes solo ven preguntas aprobadas en tests públicos
 */
export async function getDiagram(id: string) {
  const data = await apiJson<any>(`/api/diagrams/${id}`, {
    auth: true,
    fallbackError: 'No se pudo cargar el test',
  });
  return { ...data, path: resolveAssetUrl(data.path) ?? '' };
}

/**
 * Actualiza diagrama existente
 * Permite cambiar título, imagen y preguntas
 * 
 * @param id - ID del diagrama a actualizar
 * @param formData - Datos nuevos en formato FormData
 * @throws {Error} 404 si el diagrama no existe
 * @remarks
 * - Campos opcionales: title, image, questions
 * - Si se envía image, reemplaza la anterior
 * - questions: Reemplaza todo el array (no merge)
 */
export async function updateDiagram(id: string, formData: FormData) {
  return apiJson(`/api/diagrams/${id}`, {
    method: 'PUT',
    auth: true,
    body: formData,
    fallbackError: 'No se pudo actualizar',
  });
}

/**
 * Elimina un diagrama y todas sus preguntas asociadas
 * 
 * @param id - ID del diagrama a eliminar
 * @throws {Error} 403 si hay sesiones activas usando este diagrama
 * @remarks
 * - Eliminación en cascada: preguntas, opciones, sesiones
 * - No se puede eliminar si hay tests en curso
 */
export async function deleteDiagram(id: string): Promise<void> {
  await apiJson<void>(`/api/diagrams/${id}`, {
    method: 'DELETE',
    auth: true,
    fallbackError: 'No se pudo eliminar el test',
  });
}

/**
 * Lista diagramas disponibles para tests públicos
 * Usado en selector de estudiantes y supervisores
 * 
 * @returns Array de diagramas con al menos 1 pregunta aprobada
 * @remarks
 * - Solo incluye diagramas con preguntas status=APPROVED
 * - path: URL pública resuelta
 * - Ordenados alfabéticamente por título
 */
export async function listPublicDiagrams() {
  const data = await apiJson<any>(`/api/diagrams/public`, {
    auth: true,
    fallbackError: 'No se pudieron cargar los diagramas',
  });
  return Array.isArray(data)
    ? data.map((item) => ({ ...item, path: resolveAssetUrl(item.path) }))
    : data;
}