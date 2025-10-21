// src/services/questions.ts
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

const API_URL = (import.meta as any).env.VITE_API_URL as string;

function auth() {
  const t = localStorage.getItem('accessToken');
  if (!t) throw new Error('No autenticado');
  return { Authorization: `Bearer ${t}` };
}

const toAbs = (p?: string) =>
  p && !p.startsWith('http') ? `${API_URL}${p}` : (p || '');

// --- NUEVO: normalizador robusto de estado ---
function normalizeReviewStatus(v: any): 'PENDING' | 'APPROVED' | 'REJECTED' {
  if (typeof v === 'string') {
    const s = v.toUpperCase();
    if (s.includes('PEND')) return 'PENDING';
    if (s.includes('APPROV')) return 'APPROVED';
    if (s.includes('REJECT')) return 'REJECTED';
  }
  if (typeof v === 'number') {
    // por si llega como enum numérico (0/1/2)
    if (v === 0) return 'PENDING';
    if (v === 1) return 'APPROVED';
    if (v === 2) return 'REJECTED';
  }
  if (typeof v === 'boolean') {
    // por si en algún endpoint se usa "verified"
    return v ? 'APPROVED' : 'PENDING';
  }
  // valor por defecto seguro
  return 'PENDING';
}

export async function getPendingCount(): Promise<number> {
  const res = await fetch(`${API_URL}/api/questions/pending/count`, {
    headers: auth(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No disponible');
  return Number(data?.count ?? 0);
}

export async function listPendingQuestions(): Promise<PendingQuestion[]> {
  const res = await fetch(`${API_URL}/api/questions/pending`, {
    headers: auth(),
  });
  const raw = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(raw?.error || 'No se pudieron cargar las preguntas');

  return (Array.isArray(raw) ? raw : []).map((q: any) => {
    // 1) opciones: pueden venir como strings o como objetos {text, orderIndex}
    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === 'string') {
        options = q.options as string[];
      } else {
        // objetos
        const arr = (q.options as any[])
          .map(o => (o?.text ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) } : null))
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map(o => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    // 2) índice correcto: puede venir como correctIndex o correctOptionIndex
    let correctIndex = Number(
      q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0
    );
    if (!(correctIndex >= 0 && correctIndex < options.length)) {
      correctIndex = 0;
    }

    // 3) diagrama: puede venir anidado o en campos sueltos
    const dq = q.diagram || q.Diagram || null;
    const diagram = dq
      ? {
          id: String(dq.id ?? ''),
          title: String(dq.title ?? dq.name ?? ''),
          path: toAbs(dq.path ?? dq.imagePath ?? ''),
        }
      : (q.diagramTitle || q.diagramPath || q.diagramId)
      ? {
          id: String(q.diagramId ?? ''),
          title: String(q.diagramTitle ?? ''),
          path: toAbs(q.diagramPath ?? ''),
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
  const res = await fetch(`${API_URL}/api/questions/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth() },
    body: JSON.stringify({ decision, comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo verificar');
}

export async function listMyQuestions(): Promise<MyQuestion[]> {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/questions/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar tus preguntas');

  return (Array.isArray(data) ? data : []).map((q: any) => {
    // Estado robusto
    const status = normalizeReviewStatus(
      q.status ?? q.reviewStatus ?? q.state ?? (typeof q.verified === 'boolean' ? q.verified : undefined)
    ) as MyQuestion['status'];

    // ✅ Normaliza OPCIONES: strings u objetos { text, orderIndex } (o optionTexts)
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

    // ✅ Normaliza ÍNDICE CORRECTO: distintos nombres posibles
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
      diagram: q.diagram ? {
        id: String(q.diagram.id ?? ''),
        title: String(q.diagram.title ?? ''),
        path: q.diagram.path && !q.diagram.path.startsWith('http')
          ? `${API_URL}${q.diagram.path}`
          : q.diagram.path
      } : undefined,
      createdAt: q.createdAt,
      reviewedAt: q.reviewedAt ?? null,

      // 👇 ya normalizados
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
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No autenticado');

  const res = await fetch(`${API_URL}/api/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo crear la pregunta');
  return data;
}
