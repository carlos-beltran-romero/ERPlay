import { apiJson, apiRequest, API_URL } from './http';

export type TestMode = 'learning' | 'exam' | 'errors';

export type StartedSession = {
  sessionId: string;
  diagram: { id: string; title: string; path: string | null };
  questions: Array<{
    resultId: string;
    questionId?: string;
    prompt: string;
    options: string[];
    hint?: string;
    correctIndex?: number; // presente en learning
  }>;
};

export type TestSessionListItem = {
  id: string;
  mode: TestMode;
  startedAt: string;           // ISO
  finishedAt?: string | null;  // ISO
  durationSeconds?: number;
  diagram?: { id: string; title: string; path: string | null } | null;

  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score?: number | null;       // 0..100 en examen
  claimCount?: number;

  summary?: {
    accuracyPct?: number | null;
    score?: number | null;
    durationSeconds?: number | null;
    noteLabel?: string | null;
  };
  questionCount?: number;
};

export type ListMyTestsResponse = {
  items: TestSessionListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type TestResultItem = {
  resultId: string;
  questionId?: string | null;
  prompt: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex?: number | null;
  usedHint: boolean;
  revealedAnswer: boolean;
  attempts: number;
  timeSpentSeconds: number;
  isCorrect?: boolean;
  claimed?: boolean;
  claimId?: string | null;
  claimStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  claimCreatedAt?: string | null;
};

export type TestSessionDetail = {
  id: string;
  mode: TestMode;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds?: number;
  diagram?: { id: string; title: string; path: string | null } | null;
  totals: {
    totalQuestions: number;
    answered: number;
    correct: number;
    wrong: number;
    skipped: number;
    usedHints: number;
    revealed: number;
    score?: number | null; // 0..100 en examen
  };
  summary?: {
    durationSeconds?: number | null;
    accuracyPct?: number | null;
    score?: number | null;
  };
  results: TestResultItem[];
  events?: Array<{ id: string; type: string; at: string; resultId?: string; payload?: any }>;
};

/* ===== Filtros para listados ===== */
export type ListFilters = {
  mode?: TestMode | 'all';
  dateFrom?: string; // 'YYYY-MM-DD'
  dateTo?: string;   // 'YYYY-MM-DD'
  page?: number;     // 1-based
  pageSize?: number; // por defecto 20
  q?: string;        // búsqueda libre (si el back la soporta)
};

/* =========================
 * Sesión de test (jugar)
 * ========================= */
export async function startTestSession(params: { mode: TestMode; limit?: number }) {
  return apiJson<StartedSession>(`${API_URL}/api/test-sessions/start`, {
    method: 'POST',
    auth: true,
    json: params,
    fallbackError: 'No se pudo iniciar el test',
  });
}

export async function patchResult(
  sessionId: string,
  resultId: string,
  body: Partial<{
    selectedIndex: number | null;
    attemptsDelta: number;
    usedHint: boolean;
    revealedAnswer: boolean;
    timeSpentSecondsDelta: number;
  }>
) {
  await apiJson<void>(
    `${API_URL}/api/test-sessions/${sessionId}/results/${resultId}`,
    {
      method: 'PATCH',
      auth: true,
      json: body,
      fallbackError: 'No se pudo guardar',
    }
  );
  return true;
}

export async function logEvent(
  sessionId: string,
  body: { type: string; resultId?: string; payload?: any }
) {
  try {
    await apiRequest(`${API_URL}/api/test-sessions/${sessionId}/events`, {
      method: 'POST',
      auth: true,
      json: body,
    });
  } catch {
    // Silenciar errores de tracking
  }
}

export async function finishSession(sessionId: string) {
  return apiJson(`${API_URL}/api/test-sessions/${sessionId}/finish`, {
    method: 'POST',
    auth: true,
    fallbackError: 'No se pudo finalizar',
  });
}

/* =========================
 * Mis tests (listado + detalle)
 * ========================= */
export async function listMyTests(filters: ListFilters = {}): Promise<ListMyTestsResponse> {
  const params = new URLSearchParams();
  if (filters.mode && filters.mode !== 'all') params.set('mode', filters.mode);
  if (filters.dateFrom) params.set('from', filters.dateFrom);
  if (filters.dateTo) params.set('to', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.q) params.set('q', filters.q);

  const url = `${API_URL}/api/test-sessions/mine${params.toString() ? `?${params.toString()}` : ''}`;

  const data = await apiJson<any>(url, {
    auth: true,
    fallbackError: 'No se pudieron cargar tus tests',
  });

  const rawItems = (data.items || data.results || data) as any[];
  const items: TestSessionListItem[] = Array.isArray(rawItems)
    ? rawItems.map((it: any) => ({
        id: it.id,
        mode: it.mode,
        startedAt: it.startedAt,
        finishedAt: it.finishedAt ?? null,
        durationSeconds: it.durationSeconds ?? it.summary?.durationSeconds ?? null,
        diagram: it.diagram
          ? { id: it.diagram.id, title: it.diagram.title, path: it.diagram.path ?? null }
          : null,
        totalQuestions: Number(it.totalQuestions ?? it.summary?.totalQuestions ?? it.questionCount ?? 0),
        correctCount: Number(it.correctCount ?? it.summary?.correct ?? 0),
        wrongCount: Number(it.wrongCount ?? it.summary?.wrong ?? 0),
        skippedCount: Number(it.skippedCount ?? it.summary?.skipped ?? 0),
        score:
          typeof it.score === 'number'
            ? it.score
            : typeof it.summary?.score === 'number'
            ? it.summary.score
            : null,
        claimCount: Number(it.claimCount ?? 0),
        summary: it.summary ?? {
          accuracyPct: typeof it.accuracyPct === 'number' ? it.accuracyPct : undefined,
          score:
            typeof it.score === 'number'
              ? it.score
              : typeof it.summary?.score === 'number'
              ? it.summary.score
              : undefined,
          durationSeconds:
            typeof it.durationSeconds === 'number'
              ? it.durationSeconds
              : it.summary?.durationSeconds,
          noteLabel: it.noteLabel ?? null,
        },
        questionCount: Number(it.questionCount ?? it.totalQuestions ?? it.summary?.totalQuestions ?? 0),
      }))
    : [];

  return {
    items,
    page: Number(data.page ?? filters.page ?? 1),
    pageSize: Number(data.pageSize ?? filters.pageSize ?? 20),
    total: Number(data.total ?? (Array.isArray(items) ? items.length : 0)),
  };
}

export async function getTestDetail(sessionId: string): Promise<TestSessionDetail> {
  const data = await apiJson<any>(`${API_URL}/api/test-sessions/${sessionId}`, {
    auth: true,
    fallbackError: 'No se pudo cargar el detalle del test',
  });

  const results: TestResultItem[] = (data.results || []).map((r: any) => ({
    resultId: r.resultId ?? r.id,
    questionId: r.questionId ?? null,
    prompt: r.prompt,
    options: r.options,
    selectedIndex: r.selectedIndex ?? null,
    correctIndex: r.correctIndex ?? null,
    usedHint: !!r.usedHint,
    revealedAnswer: !!r.revealedAnswer,
    attempts: Number(r.attempts ?? r.attemptsCount ?? 0),
    timeSpentSeconds: Number(r.timeSpentSeconds ?? 0),
    isCorrect:
      typeof r.isCorrect === 'boolean'
        ? r.isCorrect
        : typeof r.correctIndex === 'number' && typeof r.selectedIndex === 'number'
        ? r.selectedIndex === r.correctIndex
        : undefined,
    claimed: !!r.claimed,
    claimId: r.claimId ?? null,
    claimStatus: r.claimStatus ?? null,
    claimCreatedAt: r.claimCreatedAt ?? null,
  }));

  const detail: TestSessionDetail = {
    id: data.id || sessionId,
    mode: data.mode,
    startedAt: data.startedAt,
    finishedAt: data.finishedAt ?? null,
    durationSeconds: data.durationSeconds ?? undefined,
    diagram: data.diagram
      ? { id: data.diagram.id, title: data.diagram.title, path: data.diagram.path ?? null }
      : null,
    totals: {
      totalQuestions: Number(data.totals?.totalQuestions ?? data.totalQuestions ?? results.length),
      answered: Number(
        data.totals?.answered ??
          data.answered ??
          results.filter((r) => r.selectedIndex !== null).length
      ),
      correct: Number(
        data.totals?.correct ??
          data.correct ??
          results.filter((r) => r.isCorrect === true).length
      ),
      wrong: Number(
        data.totals?.wrong ?? data.wrong ?? results.filter((r) => r.isCorrect === false).length
      ),
      skipped: Number(
        data.totals?.skipped ??
          data.skipped ??
          results.filter((r) => r.selectedIndex === null).length
      ),
      usedHints: Number(
        data.totals?.usedHints ??
          data.usedHints ??
          results.filter((r) => r.usedHint).length
      ),
      revealed: Number(
        data.totals?.revealed ??
          data.revealed ??
          results.filter((r) => r.revealedAnswer).length
      ),
      score:
        typeof data.totals?.score === 'number'
          ? data.totals.score
          : typeof data.score === 'number'
          ? data.score
          : null,
    },
    summary: {
      durationSeconds:
        typeof data.durationSeconds === 'number'
          ? data.durationSeconds
          : data.totals?.durationSeconds ?? null,
      accuracyPct:
        typeof data.accuracyPct === 'number'
          ? data.accuracyPct
          : data.totals?.accuracyPct ?? null,
      score:
        typeof data.score === 'number'
          ? data.score
          : data.totals?.score ?? null,
    },
    results,
    events: Array.isArray(data.events) ? data.events : undefined,
  };

  return detail;
}

/* =========================
 * Alias esperados por la vista Student/MyTests
 * ========================= */
export type SessionSummary = TestSessionListItem;
export type SessionDetail = TestSessionDetail;

/** Lista tus sesiones (learning/exam/errors). La vista lo importa como listMySessions */
export async function listMySessions(params: {
  mode?: 'learning' | 'exam' | 'errors';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
} = {}): Promise<SessionSummary[]> {
  const resp = await listMyTests({
    mode: params.mode ?? 'all',
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    q: params.q,
    page: 1,
    pageSize: 200,
  });
  return resp.items;
}

/** Detalle de una sesión. La vista lo importa como getSessionDetail */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  return getTestDetail(sessionId);
}
