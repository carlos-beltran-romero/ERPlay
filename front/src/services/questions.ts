/**
 * Módulo de servicios de preguntas
 * Gestiona creación y consulta de preguntas propuestas por estudiantes
 * @module front/services/questions
 */

import { apiJson } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

/** Pregunta pendiente de revisión */
export interface PendingQuestion {
  id: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
  createdAt?: string;
  creator?: { id: string; email: string; name?: string };
  diagram?: { id: string; title: string; path: string };
  claimCount?: number;
}

/** Pregunta propia del estudiante */
type MyQuestion = {
  id: string;
  prompt: string;
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  options?: string[];
  correctIndex?: number;
};

/**
 * Obtiene contador de preguntas pendientes de revisión
 * @returns Número total de preguntas con status=PENDING
 * @remarks Usado para mostrar badge en panel de supervisor
 */
export async function getPendingCount(): Promise<number> {
  const data = await apiJson<any>('/api/questions/pending/count', {
    auth: true,
    fallbackError: 'No disponible',
  });
  return Number(data?.count ?? 0);
}

/**
 * Lista preguntas pendientes de revisión
 * Solo accesible para supervisores
 * 
 * @returns Array de preguntas con datos del creador y diagrama asociado
 * @remarks Normaliza múltiples formatos de backend (opciones como string[] o array de objetos)
 */
export async function listPendingQuestions(): Promise<PendingQuestion[]> {
  const raw = await apiJson<any[]>('/api/questions/pending', {
    auth: true,
    fallbackError: 'No se pudieron cargar las preguntas',
  });

  return (Array.isArray(raw) ? raw : []).map((q: any) => {
    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === 'string') {
        options = q.options as string[];
      } else {
        const arr = (q.options as any[])
          .map(o => (o?.text ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) } : null))
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map(o => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    let correctIndex = Number(
      q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0
    );
    if (!(correctIndex >= 0 && correctIndex < options.length)) {
      correctIndex = 0;
    }

    const dq = q.diagram || q.Diagram || null;
    const diagram = dq
      ? {
          id: String(dq.id ?? ''),
          title: String(dq.title ?? dq.name ?? ''),
          path: resolveAssetUrl(dq.path ?? dq.imagePath ?? '') ?? '',
        }
      : (q.diagramTitle || q.diagramPath || q.diagramId)
      ? {
          id: String(q.diagramId ?? ''),
          title: String(q.diagramTitle ?? ''),
          path: resolveAssetUrl(q.diagramPath ?? '') ?? '',
        }
      : undefined;

    return {
      id: String(q.id),
      prompt: String(q.prompt ?? q.enunciado ?? ''),
      hint: String(q.hint ?? q.pista ?? ''),
      options,
      correctIndex,
      createdAt: q.createdAt,
      creator: q.creator
        ? {
            id: String(q.creator.id),
            email: String(q.creator.email ?? ''),
            name: q.creator.name ? String(q.creator.name) : undefined,
          }
        : undefined,
      diagram,
    } as PendingQuestion;
  });
}

/**
 * Resuelve una pregunta pendiente
 * El supervisor aprueba o rechaza la propuesta
 * 
 * @param id - ID de la pregunta
 * @param decision - Decisión del revisor
 * @param comment - Comentario opcional explicando la decisión
 * @throws {Error} Si la pregunta no existe
 * @remarks APPROVED: La pregunta se añade al banco; REJECTED: Se notifica al creador
 */
export async function verifyQuestion(
  id: string,
  decision: 'approve' | 'reject',
  comment?: string
): Promise<void> {
  await apiJson<void>(`/api/questions/${id}/verify`, {
    method: 'POST',
    auth: true,
    json: { decision, comment },
    fallbackError: 'No se pudo verificar',
  });
}

/**
 * Lista preguntas creadas por el estudiante autenticado
 * @returns Array de preguntas disponibles en el banco
 */
export async function listMyQuestions(): Promise<MyQuestion[]> {
  const data = await apiJson<any[]>('/api/questions/mine', {
    auth: true,
    fallbackError: 'No se pudieron cargar tus preguntas',
  });

  return (Array.isArray(data) ? data : []).map((q: any) => {
    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === 'string') {
        options = q.options as string[];
      } else {
        const arr = (q.options as any[])
          .map(o => (o?.text ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) } : null))
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map(o => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    let correctIndex = Number(
      q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0
    );
    if (!(correctIndex >= 0 && correctIndex < options.length)) {
      correctIndex = 0;
    }

    const dq = q.diagram || q.Diagram || null;
    const diagram = dq
      ? {
          id: String(dq.id ?? ''),
          title: String(dq.title ?? dq.name ?? ''),
          path: resolveAssetUrl(dq.path ?? dq.imagePath ?? '') ?? '',
        }
      : (q.diagramTitle || q.diagramPath || q.diagramId)
      ? {
          id: String(q.diagramId ?? ''),
          title: String(q.diagramTitle ?? ''),
          path: resolveAssetUrl(q.diagramPath ?? q.diagram_image ?? '') ?? '',
        }
      : undefined;

    return {
      id: String(q.id),
      prompt: String(q.prompt ?? ''),
      diagram,
      createdAt: q.createdAt,
      options,
      correctIndex,
    } as MyQuestion;
  });
}

/**
 * Crea una nueva pregunta
 * El estudiante propone pregunta asociada a un diagrama
 * 
 * @param payload - Datos de la pregunta (prompt, opciones, correctIndex)
 * @returns ID de la pregunta creada
 * @throws {Error} Si el diagrama no existe o falta información requerida
 * @remarks Requiere mínimo 2 opciones y correctIndex válido
 */
export async function createQuestion(payload: {
  diagramId: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
}): Promise<{ id: string }> {
  return apiJson(`/api/questions`, {
    method: 'POST',
    auth: true,
    json: payload,
    fallbackError: 'No se pudo crear la pregunta',
  });
}