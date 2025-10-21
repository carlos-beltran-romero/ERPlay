// src/services/supervisor.ts

const API_URL = import.meta.env.VITE_API_URL as string;

/* ===================== Auth & helpers (mismo patrón que otros services) ===================== */
function auth() {
  const t = localStorage.getItem('accessToken');
  if (!t) throw new Error('No autenticado');
  return { Authorization: `Bearer ${t}` };
}

async function getJSON(url: string) {
  const res = await fetch(url, { headers: auth() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error de servidor');
  return data;
}

const toAbs = (p?: string | null) =>
  p && !p.startsWith('http') ? `${API_URL}${p}` : (p || null);

/* ===================== Tipos ===================== */
export type SupStudent = { id: string; name: string; lastName: string; email: string; role: string };

export type WeeklyGoalDTO = {
  id?: string;
  weekStart: string | null;
  weekEnd: string | null;
  targetTests: number;
  createdAt?: string;
};

export type WeeklyProgressRow = {
  userId: string;
  name: string;
  email: string;
  done: number;
  target: number;
  pct: number;        // 0..100
  completed: boolean;
};

export type SupBadgeItem = {
  id: string;
  label: string;
  weekStart?: string | null;
  weekEnd?: string | null;
  earnedAt?: string | null;
};

export type SupOverview = {
  answeredCount: number;
  examScoreAvg: number;               // 0..10
  accuracyLearningPct: number;        // %
  avgTimePerQuestionSec: number;
  sessionsCompleted: number;
  bestStreakDays: number;
};

export type SupTrendPoint = {
  date: string;
  correctCount?: number;
  incorrectCount?: number;
  accuracyLearningPct?: number | null;
  examScorePct?: number | null;
};

export type SupErrorItem = {
  id: string;
  title: string;
  errorRatePct: number;
  commonChosenText?: string;
};

export type SupClaimsStats = { submitted: number; approved: number };

export type SupQuestionItem = {
  id: string;
  prompt: string;
  status: 'PENDING'|'APPROVED'|'REJECTED'|'pending'|'approved'|'rejected';
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  reviewedAt?: string | null;
};

export type SupSessionSummary = {
  id: string;
  mode: 'learning'|'exam'|'errors';
  startedAt: string;
  finishedAt?: string | null;
  diagram?: { id: string; title: string; path?: string | null } | null;
  summary?: { durationSeconds?: number | null; accuracyPct?: number | null; score?: number | null; noteLabel?: string | null };
  questionCount?: number;
};

export type SupClaimItem = {
  id: string;
  status: 'PENDING'|'APPROVED'|'REJECTED'|'pending'|'approved'|'rejected';
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
export async function supGetStudent(studentId: string): Promise<SupStudent> {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}`);
}

/* ===================== Progress (overview, trends, errors, claims stats, created questions) ===================== */
export async function supGetOverview(studentId: string): Promise<SupOverview> {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/overview`);
}

export async function supGetTrends(
  studentId: string,
  { bucket = 'day' as 'day'|'week'|'month' } = {}
) {
  const q = new URLSearchParams({ bucket }).toString();
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/trends?${q}`) as SupTrendPoint[];
}

export async function supGetErrors(studentId: string, limit = 5) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/errors?limit=${limit}`) as SupErrorItem[];
}

export async function supGetClaimsStats(studentId: string) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/claims/stats`) as SupClaimsStats;
}

export async function supGetCreatedQuestions(studentId: string, { limit = 100 } = {}) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/questions?limit=${limit}`) as SupQuestionItem[];
}

/* ===================== Tests (list) ===================== */
export async function supListUserSessions(
  studentId: string,
  { mode, dateFrom, dateTo, q }: { mode?: 'learning'|'exam'|'errors'; dateFrom?: string; dateTo?: string; q?: string }
): Promise<SupSessionSummary[]> {
  const qs = new URLSearchParams();
  if (mode) qs.set('mode', mode);
  if (dateFrom) qs.set('dateFrom', dateFrom);
  if (dateTo) qs.set('dateTo', dateTo);
  if (q) qs.set('q', q);

  const data = await getJSON(
    `${API_URL}/api/supervisor/students/${studentId}/tests${qs.toString() ? `?${qs.toString()}` : ''}`
  );

  const rows = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  return rows.map((s: any) => ({
    ...s,
    diagram: s.diagram
      ? { id: s.diagram.id, title: s.diagram.title, path: toAbs(s.diagram.path) }
      : null,
  })) as SupSessionSummary[];
}

/* ===================== Tests (detail) ===================== */
import type { SessionDetail, TestResultItem } from './tests';

/** Detalle de una sesión de un alumno (normalizado como en tests.getTestDetail) */
export async function supGetSessionDetail(studentId: string, sessionId: string): Promise<SessionDetail> {
  const url = `${API_URL}/api/supervisor/students/${studentId}/tests/${sessionId}`;
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
      typeof data.durationSeconds === 'number'
        ? data.durationSeconds
        : data.totals?.durationSeconds ?? null,
    diagram: data.diagram
      ? { id: data.diagram.id, title: data.diagram.title, path: toAbs(data.diagram.path ?? null) }
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
        data.totals?.usedHints ?? data.usedHints ?? results.filter((r) => r.usedHint).length
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
      score: typeof data.score === 'number' ? data.score : data.totals?.score ?? null,
    },
    results,
    events: Array.isArray(data.events) ? data.events : undefined,
  };

  return detail;
}

/* ===================== Claims list (para detalle del alumno) ===================== */
export async function supListUserClaims(studentId: string): Promise<SupClaimItem[]> {
  const data = await getJSON(`${API_URL}/api/supervisor/students/${studentId}/claims`);
  const rows = Array.isArray(data) ? data : (data.items || []);
  // normaliza rutas de imagen si vienen relativas
  return rows.map((c: any) => ({
    ...c,
    diagram: c.diagram
      ? { ...c.diagram, path: toAbs(c.diagram.path) || undefined }
      : c.diagram,
  })) as SupClaimItem[];
}

/* ===================== Weekly Goal (admin) ===================== */
export async function supGetWeeklyGoal(): Promise<WeeklyGoalDTO | null> {
  return await getJSON(`${API_URL}/api/supervisor/weekly-goal`);
}

export async function supPutWeeklyGoal(payload: {
  targetTests: number;
  weekStart?: string;
  weekEnd?: string;
  notify?: boolean;
}): Promise<WeeklyGoalDTO> {
  const url = `${API_URL}/api/supervisor/weekly-goal`;

  // Intento principal: PUT
  let res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth() },
    body: JSON.stringify(payload),
  });

  // Fallback a POST si el host/proxy no admite PUT o tiene mal el route
  if (!res.ok && (res.status === 404 || res.status === 405 || res.status === 501)) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify(payload),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el objetivo');
  return data as WeeklyGoalDTO;
}

export async function supGetWeeklyProgress(params?: {
  weekStart?: string;
  weekEnd?: string;
  userId?: string;   // ⬅️ nuevo (para ver progreso de un alumno concreto)
}): Promise<WeeklyProgressRow[]> {
  const qs = new URLSearchParams();
  if (params?.weekStart) qs.set('weekStart', params.weekStart);
  if (params?.weekEnd) qs.set('weekEnd', params.weekEnd);
  if (params?.userId) qs.set('userId', params.userId);
  const res = await fetch(
    `${API_URL}/api/supervisor/weekly-goal/progress${qs.toString() ? `?${qs.toString()}` : ''}`,
    { headers: auth() } // ✅ antes usaba authHeader(); aquí va auth()
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as any)?.error || 'No disponible');
  return Array.isArray(data) ? data : [];
}

export async function supGetStudentBadges(studentId: string): Promise<SupBadgeItem[]> {
  const data = await getJSON(`${API_URL}/api/supervisor/students/${studentId}/badges`);
  return Array.isArray(data) ? data : [];
}
