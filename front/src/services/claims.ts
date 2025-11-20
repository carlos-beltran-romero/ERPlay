/**
 * Módulo de servicios de reclamaciones
 * Gestiona el flujo completo de disputas sobre preguntas incorrectas
 * @module front/services/claims
 */

import { apiJson } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

/** Reclamación vista desde el estudiante que la creó */
export type MyClaim = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerComment?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  question?: { id?: string; prompt: string };
  diagram?: { id: string; title: string; path?: string };
  chosenIndex?: number;
  correctIndex?: number;
  options?: string[];
};

/** Reclamación vista desde el supervisor que la revisa */
export type PendingClaim = {
  id: string;
  diagram?: { id: string; title: string; path?: string };
  question?: { id?: string; prompt: string };
  questionId?: string | null;
  options?: string[];
  correctIndex?: number;
  chosenIndex?: number;
  reporter?: { id: string; name?: string; lastName?: string; email?: string };
  explanation?: string;
  createdAt?: string;
  reviewedAt?: string | null;
};

/**
 * Registra una nueva reclamación
 * El estudiante disputa que la respuesta marcada correcta es errónea
 * 
 * @param payload - Datos de la pregunta disputada y justificación
 * @throws {Error} Si falta información requerida o el envío falla
 * @remarks
 * - testResultId: Asocia la reclamación a la respuesta en el test
 * - explanation: Justificación del estudiante (mínimo 10 caracteres)
 * - chosenIndex: Índice que el estudiante seleccionó
 * - correctIndex: Índice que el sistema marcó como correcto
 * - Las reclamaciones entran en estado PENDING para revisión
 */
export async function createClaim(payload: {
  testResultId?: string;
  questionId?: string | null;
  diagramId: string;
  diagramTitle?: string;
  prompt: string;
  options: string[];
  chosenIndex: number;
  correctIndex: number;
  explanation: string;
}): Promise<void> {
  await apiJson<void>('/api/claims', {
    method: 'POST',
    auth: true,
    json: payload,
    fallbackError: 'No se pudo registrar la reclamación',
  });
}

/**
 * Lista las reclamaciones enviadas por el estudiante autenticado
 * 
 * @returns Array de reclamaciones con estado de revisión
 * @remarks
 * - Ordenadas por fecha descendente (más recientes primero)
 * - reviewerComment: Visible solo si status = REJECTED o APPROVED
 * - Los índices de opciones son 0-based
 */
export async function listMyClaims(): Promise<MyClaim[]> {
  const raw = await apiJson<any[]>('/api/claims/mine', {
    auth: true,
    fallbackError: 'No se pudieron cargar tus reclamaciones',
  });
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c: any) => {
    const options = normalizeOptions(c?.options);
    const status =
      c?.status === 'APPROVED' || c?.status === 'REJECTED' ? c.status : 'PENDING';
    return {
      id: String(c.id),
      status,
      reviewerComment: c?.reviewerComment ?? null,
      createdAt: c?.createdAt ?? undefined,
      reviewedAt: c?.reviewedAt ?? null,
      question: { prompt: String(c?.prompt ?? '') },
      diagram: c?.diagram
        ? {
            id: String(c.diagram.id ?? ''),
            title: String(c.diagram.title ?? ''),
            path: resolveAssetUrl(c.diagram.path ?? c.diagram.imagePath ?? '') ?? '',
          }
        : undefined,
      chosenIndex:
        typeof c?.chosenIndex === 'number'
          ? c.chosenIndex
          : typeof c?.chosen_index === 'number'
          ? c.chosen_index
          : undefined,
      correctIndex:
        typeof c?.correctIndex === 'number'
          ? c.correctIndex
          : typeof c?.correct_index === 'number'
          ? c.correct_index
          : undefined,
      options,
    };
  });
}

/**
 * Lista reclamaciones pendientes de revisión
 * Solo accesible para usuarios con rol supervisor
 * 
 * @returns Array de reclamaciones pendientes con datos del reportero
 * @remarks
 * - Ordenadas por fecha descendente
 * - reporter: Datos del estudiante que reportó (nombre, email)
 * - explanation: Justificación del estudiante
 */
export async function listPendingClaims(): Promise<PendingClaim[]> {
  const raw = await apiJson<any[]>('/api/claims/pending', {
    auth: true,
    fallbackError: 'No se pudieron cargar las reclamaciones',
  });
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c: any) => {
    const options = normalizeOptions(c?.options);
    const s = c?.student ?? {};
    const reporter = (s?.id || s?.email || s?.name)
      ? {
          id: String(s.id ?? ''),
          name: s.name ? String(s.name) : undefined,
          lastName: s.lastName ? String(s.lastName) : undefined,
          email: s.email ? String(s.email) : undefined,
        }
      : undefined;
    const qId = c?.questionId
      ? String(c.questionId)
      : c?.question?.id
      ? String(c.question.id)
      : null;
    const qPrompt =
      c?.question?.prompt != null
        ? String(c.question.prompt)
        : c?.prompt != null
        ? String(c.prompt)
        : '';

    return {
      id: String(c.id),
      diagram: c?.diagram
        ? {
            id: String(c.diagram.id ?? ''),
            title: String(c.diagram.title ?? ''),
            path: resolveAssetUrl(c.diagram.path ?? c.diagram.imagePath ?? '') ?? '',
          }
        : undefined,
      question: { id: qId ?? undefined, prompt: qPrompt },
      questionId: qId,
      options,
      correctIndex:
        typeof c?.correctIndex === 'number'
          ? c.correctIndex
          : typeof c?.correct_index === 'number'
          ? c.correct_index
          : undefined,
      chosenIndex:
        typeof c?.chosenIndex === 'number'
          ? c.chosenIndex
          : typeof c?.chosen_index === 'number'
          ? c.chosen_index
          : undefined,
      reporter,
      explanation: c?.explanation ? String(c.explanation) : '',
      createdAt: c?.createdAt ?? undefined,
      reviewedAt: c?.reviewedAt ?? null,
    };
  });
}

/**
 * Obtiene el contador de reclamaciones pendientes
 * Usado para mostrar badges en el panel de supervisor
 * 
 * @returns Número total de reclamaciones con status PENDING
 */
export async function getPendingClaimsCount(): Promise<number> {
  const data = await apiJson<any>('/api/claims/pending/count', {
    auth: true,
    fallbackError: 'No disponible',
  });
  return Number(data?.count ?? 0);
}

/**
 * Resuelve una reclamación
 * El supervisor decide si es válida (APPROVED) o no (REJECTED)
 * 
 * @param id - ID de la reclamación a resolver
 * @param decision - Decisión del revisor
 * @param comment - Comentario opcional explicando la decisión
 * @throws {Error} Si la reclamación no existe o el revisor no tiene permisos
 * @remarks
 * - APPROVED: La reclamación era correcta, se notifica al estudiante
 * - REJECTED: La reclamación era incorrecta, el comment explica por qué
 * - El estudiante recibe email con el resultado
 * - La reclamación no puede volver a editarse tras resolución
 */
export async function verifyClaim(
  id: string,
  decision: 'approve' | 'reject',
  comment?: string,
  opts?: { rejectOtherSolutions?: boolean }
): Promise<void> {
  await apiJson<void>(`/api/claims/${id}/verify`, {
    method: 'POST',
    auth: true,
    json: { decision, comment, rejectOtherSolutions: opts?.rejectOtherSolutions },
    fallbackError: 'No se pudo aplicar la revisión',
  });
}

/**
 * Normaliza opciones del backend
 * Maneja formatos legacy (array de objetos) y modernos (array de strings)
 * 
 * @param raw - Opciones en formato heterogéneo
 * @returns Array plano de textos
 * @internal
 */
function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === 'string') return raw as string[];
  return (raw as any[])
    .map((o) => (typeof o?.text === 'string' ? o.text : undefined))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}