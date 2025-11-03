import { apiJson } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

export interface PendingQuestion {
  id: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
  createdAt?: string;
  creator?: { id: string; email: string; name?: string };
  diagram?: { id: string; title: string; path: string };
}

type MyQuestion = {
  id: string;
  prompt: string;
  status: 'PENDING'|'APPROVED'|'REJECTED';
  reviewComment?: string|null;
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  reviewedAt?: string|null;
  options?: string[];
  correctIndex?: number;
};

function normalizeReviewStatus(v: any): 'PENDING' | 'APPROVED' | 'REJECTED' {
  if (typeof v === 'string') {
    const s = v.toUpperCase();
    if (s.includes('PEND')) return 'PENDING';
    if (s.includes('APPROV')) return 'APPROVED';
    if (s.includes('REJECT')) return 'REJECTED';
  }
  if (typeof v === 'number') {
    if (v === 0) return 'PENDING';
    if (v === 1) return 'APPROVED';
    if (v === 2) return 'REJECTED';
  }
  if (typeof v === 'boolean') return v ? 'APPROVED' : 'PENDING';
  return 'PENDING';
}

export async function getPendingCount(): Promise<number> {
  const data = await apiJson<any>('/api/questions/pending/count', {
    auth: true,
    fallbackError: 'No disponible',
  });
  return Number(data?.count ?? 0);
}

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

export async function listMyQuestions(): Promise<MyQuestion[]> {
  const data = await apiJson<any[]>('/api/questions/mine', {
    auth: true,
    fallbackError: 'No se pudieron cargar tus preguntas',
  });

  return (Array.isArray(data) ? data : []).map((q: any) => {
    const status = normalizeReviewStatus(
      q.status ?? q.reviewStatus ?? q.state ?? (typeof q.verified === 'boolean' ? q.verified : undefined)
    ) as MyQuestion['status'];

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

    return {
      id: String(q.id),
      prompt: String(q.prompt ?? ''),
      status,
      reviewComment: q.reviewComment ?? null,
      diagram: q.diagram
        ? {
            id: String(q.diagram.id ?? ''),
            title: String(q.diagram.title ?? ''),
            path: resolveAssetUrl(q.diagram.path) ?? '',
          }
        : undefined,
      createdAt: q.createdAt,
      reviewedAt: q.reviewedAt ?? null,
      options,
      correctIndex,
    } as MyQuestion;
  });
}

export async function createQuestion(payload: {
  diagramId: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
}): Promise<{ id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }> {
  return apiJson(`/api/questions`, {
    method: 'POST',
    auth: true,
    json: payload,
    fallbackError: 'No se pudo crear la pregunta',
  });
}
