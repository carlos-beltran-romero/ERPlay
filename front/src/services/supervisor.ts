import { apiJson, API_URL, ApiError } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

async function getJSON(url: string, fallbackError = 'Error de servidor') {
  return apiJson<any>(url, { auth: true, fallbackError });
}

const toAbs = (p?: string | null) => resolveAssetUrl(p) ?? null;

/* ===================== Tipos (sin cambios) ===================== */
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
export async function supGetStudent(studentId: string) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}`);
}

/* ===================== Progress ===================== */
export async function supGetOverview(studentId: string) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/overview`);
}

export async function supGetTrends(
  studentId: string,
  { bucket = 'day' as 'day'|'week'|'month' } = {}
) {
  const q = new URLSearchParams({ bucket }).toString();
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/trends?${q}`);
}

export async function supGetErrors(studentId: string, limit = 5) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/progress/errors?limit=${limit}`);
}

export async function supGetClaimsStats(studentId: string) {
  return await getJSON(`${API_URL}/api/supervisor/students/${studentId}/claims/stats`);
}

/* ===================== Preguntas creadas por un usuario ===================== */
export async function supGetCreatedQuestions(
  userId: string,
  opts: { limit?: number } = {}
) {
  const data = await apiJson<any>(
    `${API_URL}/api/supervisor/students/${userId}/questions?limit=${opts.limit ?? 200}`,
    {
      auth: true,
      fallbackError: 'No se pudieron cargar las preguntas del alumno',
    }
  );

  const rows = Array.isArray((data as any)?.items) ? (data as any).items : (Array.isArray(data) ? data : []);
  return rows.map((q: any) => {
    const status =
      (q.status ?? q.reviewStatus ?? q.state ?? ((typeof q.verified === 'boolean') ? (q.verified ? 'APPROVED' : 'PENDING') : 'PENDING')) as any;

    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === 'string') {
        options = q.options as string[];
      } else {
        const arr = (q.options as any[])
          .map((o) => (o?.text ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) } : null))
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map((o) => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    let correctIndex = Number(q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0);
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
            path: toAbs(q.diagram.path),
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
export async function supListUserSessions(
  studentId: string,
  { mode, dateFrom, dateTo, q }: { mode?: 'learning'|'exam'|'errors'; dateFrom?: string; dateTo?: string; q?: string }
) {
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
  }));
}

/* ===================== Tests (detail) ===================== */
import type { SessionDetail, TestResultItem } from './tests';

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

/* ===================== Claims list ===================== */
export async function supListUserClaims(studentId: string) {
  const data = await getJSON(`${API_URL}/api/supervisor/students/${studentId}/claims`);
  const rows = Array.isArray(data) ? data : (data.items || []);
  return rows.map((c: any) => ({
    ...c,
    diagram: c.diagram ? { ...c.diagram, path: toAbs(c.diagram.path) || undefined } : c.diagram,
  }));
}

/* ===================== Weekly Goal (admin) ===================== */
export async function supGetWeeklyGoal() {
  return await getJSON(`${API_URL}/api/supervisor/weekly-goal`);
}

export async function supPutWeeklyGoal(payload: {
  targetTests: number;
  weekStart?: string;
  weekEnd?: string;
  notify?: boolean;
}): Promise<WeeklyGoalDTO> {
  const url = `${API_URL}/api/supervisor/weekly-goal`;

  try {
    return await apiJson<WeeklyGoalDTO>(url, {
      method: 'PUT',
      auth: true,
      json: payload,
      fallbackError: 'No se pudo guardar el objetivo',
    });
  } catch (error) {
    if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
      return apiJson<WeeklyGoalDTO>(url, {
        method: 'POST',
        auth: true,
        json: payload,
        fallbackError: 'No se pudo guardar el objetivo',
      });
    }
    throw error;
  }
}

export async function supGetWeeklyProgress(params?: {
  weekStart?: string;
  weekEnd?: string;
  userId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.weekStart) qs.set('weekStart', params.weekStart);
  if (params?.weekEnd) qs.set('weekEnd', params.weekEnd);
  if (params?.userId) qs.set('userId', params.userId);

  const data = await apiJson<any>(
    `${API_URL}/api/supervisor/weekly-goal/progress${qs.toString() ? `?${qs.toString()}` : ''}`,
    {
      auth: true,
      fallbackError: 'No disponible',
    }
  );
  return Array.isArray(data) ? data : [];
}

export async function supGetStudentBadges(studentId: string) {
  const data = await getJSON(`${API_URL}/api/supervisor/students/${studentId}/badges`);
  return Array.isArray(data) ? data : [];
}
