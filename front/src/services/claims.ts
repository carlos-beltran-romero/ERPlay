// src/services/claims.ts
const API_URL = import.meta.env.VITE_API_URL as string;

function auth() {
  const t = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  if (!t) throw new Error('No autenticado');
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

const toAbs = (p?: string | null) =>
  p ? (p.startsWith('http') ? p : `${API_URL}${p}`) : '';

/* -------------------- Tipos usados en el front -------------------- */

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

/* -------------------- Helpers -------------------- */

// Convierte el array de opciones a string[] independientemente del shape
function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  // Si ya es string[]
  if (typeof raw[0] === 'string') return raw as string[];
  // Si viene [{text: string}, ...]
  return (raw as any[])
    .map((o) => (typeof o?.text === 'string' ? o.text : undefined))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s) => s);
}

/* -------------------- Crear reclamación -------------------- */

export async function createClaim(payload: {
  testResultId?: string;     // ⬅️ NUEVO
  questionId?: string | null;
  diagramId: string;
  diagramTitle?: string; // opcional, el backend lo ignora sin problema
  prompt: string;
  options: string[];
  chosenIndex: number;
  correctIndex: number;
  explanation: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/claims`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la reclamación');
}

/* -------------------- Reclamaciones del alumno -------------------- */

export async function listMyClaims(): Promise<MyClaim[]> {
  const res = await fetch(`${API_URL}/api/claims/mine`, { headers: auth() });
  const raw = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(raw?.error || 'No se pudieron cargar tus reclamaciones');

  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c: any): MyClaim => {
    const status: MyClaim['status'] =
      c?.status === 'APPROVED' || c?.status === 'REJECTED' ? c.status : 'PENDING';

    const options = normalizeOptions(c?.options);

    return {
      id: String(c.id),
      status,
      reviewerComment: c?.reviewerComment ?? null,
      createdAt: c?.createdAt ?? undefined,
      reviewedAt: c?.reviewedAt ?? null,

      // el backend devuelve 'prompt' suelto -> lo mapeamos a question.prompt
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

/* -------------------- Pendientes para supervisor -------------------- */

export async function listPendingClaims(): Promise<PendingClaim[]> {
  const res = await fetch(`${API_URL}/api/claims/pending`, { headers: auth() });
  const raw = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(raw?.error || 'No se pudieron cargar las reclamaciones');

  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((c: any): PendingClaim => {
    const options = normalizeOptions(c?.options);

    // reporter desde 'student'
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
  const res = await fetch(`${API_URL}/api/claims/pending/count`, { headers: auth() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No disponible');
  return Number(data?.count ?? 0);
}

export async function verifyClaim(
  id: string,
  decision: 'approve' | 'reject',
  comment?: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/claims/${id}/verify`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ decision, comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo aplicar la revisión');
}
