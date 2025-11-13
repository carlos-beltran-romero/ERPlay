/**
 * Módulo de servicios de supervisor
 * Gestiona operaciones administrativas sobre estudiantes, objetivos y análisis
 * @module front/services/supervisor
 */

import { fetchAuth, API_URL } from './http';

/**
 * Helper para peticiones JSON con manejo de errores
 * @internal
 */
async function getJSON(url: string) {
  const res = await fetchAuth(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error de servidor');
  return data;
}

/**
 * Resuelve path de imagen a URL absoluta
 * @internal
 */
const toAbs = (p?: string | null) =>
  p && !p.startsWith('http') ? `${API_URL}${p}` : (p || null);

/* ===================== Tipos ===================== */

/** Estudiante vista desde supervisor */
export type SupStudent = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
};

/** Objetivo semanal con rango de fechas */
export type WeeklyGoalDTO = {
  id?: string;
  weekStart: string | null;
  weekEnd: string | null;
  targetTests: number;
  createdAt?: string;
};

/** Progreso semanal de un estudiante */
export type WeeklyProgressRow = {
  userId: string;
  name: string;
  email: string;
  done: number;
  target: number;
  pct: number;
  completed: boolean;
};

/** Insignia ganada por estudiante */
export type SupBadgeItem = {
  id: string;
  label: string;
  weekStart?: string | null;
  weekEnd?: string | null;
  earnedAt?: string | null;
};

/** KPIs de un estudiante */
export type SupOverview = {
  answeredCount: number;
  examScoreAvg: number;
  accuracyLearningPct: number;
  avgTimePerQuestionSec: number;
  sessionsCompleted: number;
  bestStreakDays: number;
};

/** Punto de tendencia temporal */
export type SupTrendPoint = {
  date: string;
  correctCount?: number;
  incorrectCount?: number;
  accuracyLearningPct?: number | null;
  examScorePct?: number | null;
};

/** Pregunta problemática de un estudiante */
export type SupErrorItem = {
  id: string;
  title: string;
  errorRatePct: number;
  commonChosenText?: string;
};

/** Estadísticas de reclamaciones */
export type SupClaimsStats = { submitted: number; approved: number };

/** Pregunta creada por estudiante con estado de revisión */
export type SupQuestionItem = {
  id: string;
  prompt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  reviewedAt?: string | null;
};

/** Resumen de sesión de test */
export type SupSessionSummary = {
  id: string;
  mode: 'learning' | 'exam' | 'errors';
  startedAt: string;
  finishedAt?: string | null;
  diagram?: { id: string; title: string; path?: string | null } | null;
  summary?: {
    durationSeconds?: number | null;
    accuracyPct?: number | null;
    score?: number | null;
    noteLabel?: string | null;
  };
  questionCount?: number;
};

/** Reclamación vista desde supervisor */
export type SupClaimItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  reviewedAt?: string | null;
  reviewerComment?: string | null;
  prompt?: string;
  promptSnapshot?: string;
  options?: string[];
  optionsSnapshot?: string[];
  chosenIndex?: number | null;
  correctIndex?: number | null;
  correctIndexAtSubmission?: number | null;
  question?: { id?: string; prompt: string };
  diagram?: { id: string; title: string; path?: string };
};

/* ===================== Students ===================== */

/**
 * Obtiene datos de un estudiante
 * @param studentId - ID del estudiante
 * @returns Datos básicos (nombre, email, rol)
 */
export async function supGetStudent(studentId: string) {
  return await getJSON(`/api/supervisor/students/${studentId}`);
}

/* ===================== Progress ===================== */

/**
 * Obtiene KPIs de un estudiante
 * @param studentId - ID del estudiante
 * @returns Overview con métricas de rendimiento
 */
export async function supGetOverview(studentId: string) {
  return await getJSON(`/api/supervisor/students/${studentId}/progress/overview`);
}

/**
 * Obtiene tendencias temporales de un estudiante
 * @param studentId - ID del estudiante
 * @param options - Granularidad temporal (day/week/month)
 * @returns Serie temporal de rendimiento
 */
export async function supGetTrends(
  studentId: string,
  { bucket = 'day' as 'day' | 'week' | 'month' } = {}
) {
  const q = new URLSearchParams({ bucket }).toString();
  return await getJSON(`/api/supervisor/students/${studentId}/progress/trends?${q}`);
}

/**
 * Lista preguntas más falladas por un estudiante
 * @param studentId - ID del estudiante
 * @param limit - Máximo de preguntas a retornar
 * @returns Array ordenado por errorRatePct descendente
 */
export async function supGetErrors(studentId: string, limit = 5) {
  return await getJSON(
    `/api/supervisor/students/${studentId}/progress/errors?limit=${limit}`
  );
}

/**
 * Obtiene estadísticas de reclamaciones de un estudiante
 * @param studentId - ID del estudiante
 * @returns Total enviadas y aprobadas
 */
export async function supGetClaimsStats(studentId: string) {
  return await getJSON(`/api/supervisor/students/${studentId}/claims/stats`);
}

/* ===================== Preguntas creadas por un usuario ===================== */

/**
 * Lista preguntas creadas por un estudiante
 * @param userId - ID del estudiante
 * @param opts - Límite de resultados
 * @returns Array de preguntas con estado de revisión
 * @remarks Normaliza formatos legacy (options como string[] o array de objetos)
 */
export async function supGetCreatedQuestions(
  userId: string,
  opts: { limit?: number } = {}
) {
  const res = await fetchAuth(
    `/api/supervisor/students/${userId}/questions?limit=${opts.limit ?? 200}`
  );
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las preguntas del alumno');

  const rows = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
    ? data
    : [];
  return rows.map((q: any) => {
    const status =
      (q.status ??
        q.reviewStatus ??
        q.state ??
        (typeof q.verified === 'boolean' ? (q.verified ? 'APPROVED' : 'PENDING') : 'PENDING')) as any;

    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === 'string') {
        options = q.options as string[];
      } else {
        const arr = (q.options as any[])
          .map((o) =>
            o?.text ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) } : null
          )
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map((o) => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    let correctIndex = Number(
      q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0
    );
    if (!(correctIndex >= 0 && correctIndex < options.length)) correctIndex = 0;

    return {
      id: String(q.id),
      prompt: String(q.prompt ?? ''),
      status,
      reviewComment: q.reviewComment ?? null,
      diagram: q.diagram
        ? {
            id: String(q.diagram.id ?? ''),
            title: String(q.diagram.title ?? ''),
            path:
              q.diagram.path && !q.diagram.path.startsWith('http')
                ? `${API_URL}${q.diagram.path}`
                : q.diagram.path,
          }
        : undefined,
      createdAt: q.createdAt,
      reviewedAt: q.reviewedAt ?? null,
      options,
      correctIndex,
    };
  });
}

/* ===================== Tests (list) ===================== */

/**
 * Lista sesiones de test de un estudiante
 * @param studentId - ID del estudiante
 * @param filters - Filtros de modo, fecha y búsqueda
 * @returns Array de sesiones con resumen de resultados
 */
export async function supListUserSessions(
  studentId: string,
  {
    mode,
    dateFrom,
    dateTo,
    q,
  }: { mode?: 'learning' | 'exam' | 'errors'; dateFrom?: string; dateTo?: string; q?: string }
) {
  const qs = new URLSearchParams();
  if (mode) qs.set('mode', mode);
  if (dateFrom) qs.set('dateFrom', dateFrom);
  if (dateTo) qs.set('dateTo', dateTo);
  if (q) qs.set('q', q);

  const data = await getJSON(
    `/api/supervisor/students/${studentId}/tests${
      qs.toString() ? `?${qs.toString()}` : ''
    }`
  );

  const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return rows.map((s: any) => ({
    ...s,
    diagram: s.diagram
      ? { id: s.diagram.id, title: s.diagram.title, path: toAbs(s.diagram.path) }
      : null,
  }));
}

/* ===================== Tests (detail) ===================== */

import type { SessionDetail, TestResultItem } from './tests';

/**
 * Obtiene detalle completo de una sesión de test
 * Incluye respuestas, tiempo por pregunta y uso de pistas
 * 
 * @param studentId - ID del estudiante
 * @param sessionId - ID de la sesión
 * @returns Detalle con resultados por pregunta y totales
 */
export async function supGetSessionDetail(
  studentId: string,
  sessionId: string
): Promise<SessionDetail> {
  const url = `/api/supervisor/students/${studentId}/tests/${sessionId}`;
  const data = await getJSON(url);

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

  const detail: SessionDetail = {
    id: data.id || sessionId,
    mode: data.mode,
    startedAt: data.startedAt,
    finishedAt: data.finishedAt ?? null,
    durationSeconds:
      typeof data.durationSeconds === 'number' ? data.durationSeconds : data.totals?.durationSeconds ?? null,
    diagram: data.diagram
      ? { id: data.diagram.id, title: data.diagram.title, path: toAbs(data.diagram.path ?? null) }
      : null,
    totals: {
      totalQuestions: Number(
        data.totals?.totalQuestions ?? data.totalQuestions ?? results.length
      ),
      answered: Number(
        data.totals?.answered ??
          data.answered ??
          results.filter((r) => r.selectedIndex !== null).length
      ),
      correct: Number(
        data.totals?.correct ?? data.correct ?? results.filter((r) => r.isCorrect === true).length
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
        data.totals?.usedHints ?? data.usedHints ?? results.filter((r) => r.usedHint).length
      ),
      revealed: Number(
        data.totals?.revealed ?? data.revealed ?? results.filter((r) => r.revealedAnswer).length
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
        typeof data.accuracyPct === 'number' ? data.accuracyPct : data.totals?.accuracyPct ?? null,
      score: typeof data.score === 'number' ? data.score : data.totals?.score ?? null,
    },
    results,
    events: Array.isArray(data.events) ? data.events : undefined,
  };

  return detail;
}

/* ===================== Claims list ===================== */

/**
 * Lista reclamaciones de un estudiante
 * @param studentId - ID del estudiante
 * @returns Array de reclamaciones con estado de revisión
 * @remarks Normaliza path de diagrama a URL absoluta
 */
export async function supListUserClaims(studentId: string) {
  const data = await getJSON(`/api/supervisor/students/${studentId}/claims`);
  const rows = Array.isArray(data) ? data : (data.items || []);
  return rows.map((c: any) => ({
    ...c,
    diagram: c.diagram ? { ...c.diagram, path: toAbs(c.diagram.path) || undefined } : c.diagram,
  }));
}

/* ===================== Weekly Goal (admin) ===================== */

/**
 * Obtiene el objetivo semanal actual
 * @returns Objetivo vigente del sistema
 */
export async function supGetWeeklyGoal() {
  return await getJSON(`/api/supervisor/weekly-goal`);
}

/**
 * Crea o actualiza objetivo semanal
 * @param payload - Meta de tests y rango de fechas opcional
 * @returns Objetivo creado/actualizado
 * @remarks Intenta PUT primero, fallback a POST para compatibilidad con backend legacy
 */
export async function supPutWeeklyGoal(payload: {
  targetTests: number;
  weekStart?: string;
  weekEnd?: string;
  notify?: boolean;
}) {
  const url = `/api/supervisor/weekly-goal`;

  let res = await fetchAuth(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok && (res.status === 404 || res.status === 405 || res.status === 501)) {
    res = await fetchAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el objetivo');
  return data;
}

/**
 * Lista progreso semanal de estudiantes
 * @param params - Rango de fechas y filtro de usuario opcional
 * @returns Array de progreso por estudiante ordenado alfabéticamente
 * @remarks Si no se especifica rango, usa el objetivo actual
 */
export async function supGetWeeklyProgress(params?: {
  weekStart?: string;
  weekEnd?: string;
  userId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.weekStart) qs.set('weekStart', params.weekStart);
  if (params?.weekEnd) qs.set('weekEnd', params.weekEnd);
  if (params?.userId) qs.set('userId', params.userId);

  const res = await fetchAuth(
    `/api/supervisor/weekly-goal/progress${
      qs.toString() ? `?${qs.toString()}` : ''
    }`
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as any)?.error || 'No disponible');
  return Array.isArray(data) ? data : [];
}

/**
 * Lista insignias de un estudiante
 * @param studentId - ID del estudiante
 * @returns Array de badges ordenados por fecha de obtención
 */
export async function supGetStudentBadges(studentId: string) {
  const data = await getJSON(`/api/supervisor/students/${studentId}/badges`);
  return Array.isArray(data) ? data : [];
}