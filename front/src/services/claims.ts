// src/services/claims.ts
import { fetchAuth, API_URL } from './http';

const toAbs = (p?: string | null) =>
  p ? (p.startsWith('http') ? p : `${API_URL}${p}`) : '';

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

export type PendingClaim = {
  id: string;
  diagram?: { id: string; title: string; path?: string };
  question?: { id?: string; prompt: string };
  questionId?: string | null; // para filtrar en la vista del profe
  options?: string[];
  correctIndex?: number;
  chosenIndex?: number;
  reporter?: { id: string; name?: string; lastName?: string; email?: string };
  explanation?: string;
  createdAt?: string;
  reviewedAt?: string | null;
};

// ↓↓↓ BORRA la función auth() anterior y deja de leer tokens a mano.

// -------------------- Crear reclamación --------------------
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
  const res = await fetchAuth(`${API_URL}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la reclamación');
}

export async function listMyClaims(): Promise<MyClaim[]> {
  const res = await fetchAuth(`${API_URL}/api/claims/mine`);
  const raw = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(raw?.error || 'No se pudieron cargar tus reclamaciones');
  // ... resto igual ...
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c: any) => {
    // ... normalización igual que la tuya ...
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
            path: toAbs(c.diagram.path ?? c.diagram.imagePath ?? ''),
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

export async function listPendingClaims(): Promise<PendingClaim[]> {
  const res = await fetchAuth(`${API_URL}/api/claims/pending`);
  const raw = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(raw?.error || 'No se pudieron cargar las reclamaciones');
  // ... resto igual ...
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
            path: toAbs(c.diagram.path ?? c.diagram.imagePath ?? ''),
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

export async function getPendingClaimsCount(): Promise<number> {
  const res = await fetchAuth(`${API_URL}/api/claims/pending/count`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No disponible');
  return Number(data?.count ?? 0);
}

export async function verifyClaim(
  id: string,
  decision: 'approve' | 'reject',
  comment?: string
): Promise<void> {
  const res = await fetchAuth(`${API_URL}/api/claims/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo aplicar la revisión');
}

/* helpers */
function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === 'string') return raw as string[];
  return (raw as any[])
    .map((o) => (typeof o?.text === 'string' ? o.text : undefined))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}
