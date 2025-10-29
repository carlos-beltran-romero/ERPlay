// src/services/progress.ts
import { fetchAuth, API_URL } from './http';

async function getJSON(url: string) {
  const res = await fetchAuth(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error de servidor');
  return data;
}

/* =========================
 * Tipos del módulo
 * ========================= */
export type Overview = {
  accuracyLearningPct: number; // 0..100
  examScoreAvg: number;       // 0..10
  answeredCount: number;
  avgTimePerQuestionSec: number;
  sessionsCompleted: number;
  deltaExamVsLearningPts: number; // puntos porcentuales
  bestStreakDays: number;
};

export type WeeklyProgressRow = {
  userId: string;
  name?: string;
  email?: string;
  done: number;
  target: number;
  pct: number;       // 0..100
  completed: boolean;
  weekStart?: string | null;
  weekEnd?: string | null;
};

export type BadgeItem = {
  id: string;
  label: string;
  weekStart?: string | null;
  weekEnd?: string | null;
  earnedAt?: string | null;
};

export type ErrorItem = {
  id: string;
  title: string;
  errorRatePct: number;
  commonChosenIndex?: number;
  commonChosenText?: string;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  accuracyLearningPct?: number; // 0..100
  examScorePct?: number;        // 0..100
  correctCount?: number;
  incorrectCount?: number;
};

export type Habits = {
  byHour: { hour: number; answered: number }[]; // 0..23
  avgSessionDurationSec: number;
  hintsPerQuestionPct: number; // 0..100 (solo learning)
};

export type ClaimsStats = { submitted: number; approved: number };

export type Goal = {
  weeklyTargetQuestions: number;
  weekAnswered: number;
  currentStreakDays: number;
};

/* =========================
 * Endpoints de progreso
 * ========================= */
export async function getOverview(): Promise<Overview> {
  const data = await getJSON(`${API_URL}/api/progress/overview`);
  return {
    accuracyLearningPct: Number(data.accuracyLearningPct ?? data.learningAccuracyPct ?? 0),
    examScoreAvg: Number(data.examScoreAvg ?? data.avgExamScore ?? 0),
    answeredCount: Number(data.answeredCount ?? data.answered ?? 0),
    avgTimePerQuestionSec: Number(data.avgTimePerQuestionSec ?? data.avgSecPerQuestion ?? 0),
    sessionsCompleted: Number(data.sessionsCompleted ?? data.sessions ?? 0),
    deltaExamVsLearningPts: Number(data.deltaExamVsLearningPts ?? data.deltaExamLearning ?? 0),
    bestStreakDays: Number(data.bestStreakDays ?? data.bestStreak ?? 0),
  };
}

export async function getTrends(params?: { from?: string; to?: string; bucket?: 'day' | 'week' }) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.bucket) q.set('bucket', params.bucket);
  const url = `${API_URL}/api/progress/trends${q.toString() ? `?${q.toString()}` : ''}`;

  const res = await fetchAuth(url);
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'No se pudieron cargar tendencias');

  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((d) => ({
    date: String(d.date ?? d.day ?? d.bucket ?? ''),
    accuracyLearningPct: d.accuracyLearningPct ?? d.accLearningPct ?? undefined,
    examScorePct: d.examScorePct ?? d.examPct ?? undefined,
    correctCount: Number(d.correctCount ?? d.correct ?? 0),
    incorrectCount: Number(d.incorrectCount ?? d.incorrect ?? 0),
  })) as TrendPoint[];
}

export async function getErrors(limit = 5): Promise<ErrorItem[]> {
  const res = await fetchAuth(`${API_URL}/api/progress/errors?limit=${limit}`);
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'No se pudieron cargar errores');
  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((e) => ({
    id: String(e.id ?? e.questionId ?? crypto.randomUUID()),
    title: String(e.title ?? e.prompt ?? 'Pregunta'),
    errorRatePct: Number(e.errorRatePct ?? e.errorPct ?? 0),
    commonChosenIndex:
      typeof e.commonChosenIndex === 'number'
        ? e.commonChosenIndex
        : e.commonChosenIndex != null
        ? Number(e.commonChosenIndex)
        : undefined,
    commonChosenText: e.commonChosenText ? String(e.commonChosenText) : undefined,
  }));
}

export async function getHabits(): Promise<Habits> {
  const data = await getJSON(`${API_URL}/api/progress/habits`);
  const byHourSrc = Array.isArray(data.byHour) ? data.byHour : [];
  const byHour = byHourSrc.map((h: any) => ({
    hour: Number(h.hour ?? 0),
    answered: Number(h.answered ?? h.count ?? 0),
  }));
  return {
    byHour,
    avgSessionDurationSec: Number(data.avgSessionDurationSec ?? data.avgSessionSec ?? 0),
    hintsPerQuestionPct: Number(data.hintsPerQuestionPct ?? data.hintsPct ?? 0),
  } as Habits;
}

export async function getClaimsStats(): Promise<ClaimsStats> {
  const data = await getJSON(`${API_URL}/api/progress/claims`);
  return { submitted: Number(data.submitted ?? 0), approved: Number(data.approved ?? 0) };
}

export async function getGoal(): Promise<Goal> {
  const data = await getJSON(`${API_URL}/api/progress/goal`);
  return {
    weeklyTargetQuestions: Number(data.weeklyTargetQuestions ?? data.target ?? 0),
    weekAnswered: Number(data.weekAnswered ?? data.answered ?? 0),
    currentStreakDays: Number(data.currentStreakDays ?? data.streak ?? 0),
  };
}

export async function getBadges(): Promise<BadgeItem[]> {
  const res = await fetchAuth(`${API_URL}/api/progress/badges`);
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'No se pudieron cargar insignias');
  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((b) => ({
    id: String(b.id ?? crypto.randomUUID()),
    label: String(b.label ?? b.name ?? 'Insignia'),
    earnedAt: b.earnedAt ?? b.at ?? undefined,
  }));
}

export async function getQuestionOptionText(questionId: string, optionIndex: number): Promise<string | null> {
  const res = await fetchAuth(`${API_URL}/api/questions/${questionId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) return null;
  const options = Array.isArray(data.options) ? data.options : [];
  const found = options.find((o: any) => Number(o.orderIndex) === Number(optionIndex));
  return found?.text ?? null;
}

export type MyQuestionItem = {
  id: string;
  title: string;
  status: 'approved' | 'rejected' | 'pending';
  reviewedAt?: string | null;
  reviewerName?: string | null;
};

export async function getMyCreatedQuestions(params?: {
  limit?: number; page?: number; status?: 'all'|'approved'|'rejected'|'pending'
}): Promise<MyQuestionItem[]> {
  const limit = params?.limit ?? 50;
  const status = params?.status ?? 'all';
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  if (params?.page) qs.set('page', String(params.page));
  if (status !== 'all') qs.set('status', status);

  async function hit(url: string) {
    const res = await fetchAuth(url);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new Error(data?.error || 'No se pudo cargar "mis preguntas"');
    const arr = Array.isArray(data) ? data : (data.items || data.results || []);
    return (arr as any[]).map((q) => ({
      id: String(q.id),
      title: String(q.title ?? q.prompt ?? 'Pregunta'),
      status: (q.status ?? q.reviewStatus ?? 'pending').toLowerCase(),
      reviewedAt: q.reviewedAt ?? q.review_date ?? q.updatedAt ?? null,
      reviewerName: q.reviewer?.name ?? q.reviewerName ?? null,
    })) as MyQuestionItem[];
  }

  try { return await hit(`${API_URL}/api/progress/my-questions?${qs.toString()}`); } catch {}
  try { return await hit(`${API_URL}/api/questions/mine?${qs.toString()}`); } catch {}
  return await hit(`${API_URL}/api/questions?createdBy=me&${qs.toString()}`);
}

export async function updateGoal(payload: { weeklyTargetQuestions: number }) : Promise<Goal> {
  const res = await fetchAuth(`${API_URL}/api/progress/goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el objetivo');
  return {
    weeklyTargetQuestions: Number(data.weeklyTargetQuestions ?? data.target ?? payload.weeklyTargetQuestions),
    weekAnswered: Number(data.weekAnswered ?? data.answered ?? 0),
    currentStreakDays: Number(data.currentStreakDays ?? data.streak ?? 0),
  };
}

export async function getMyBadges(): Promise<BadgeItem[]> {
  const data = await getJSON(`${API_URL}/api/progress/badges`);
  return Array.isArray(data) ? data : [];
}

export async function getMyWeeklyProgress(): Promise<WeeklyProgressRow | null> {
  const urls = [
    `${API_URL}/api/progress/weekly-progress`,
    `${API_URL}/api/progress/weekly-goal/progress`,
  ];
  let data: any = null, ok = false, lastErr: any = null;

  for (const url of urls) {
    try {
      data = await getJSON(url);
      ok = true;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!ok) throw lastErr || new Error('No disponible');

  if (!data) return null;

  const target = Number(data.target ?? 0);
  const done   = Number(data.done ?? 0);
  const pct    = typeof data.pct === 'number' ? data.pct : (target ? Math.round((done / target) * 100) : 0);

  return {
    userId: String(data.userId ?? 'me'),
    done, target, pct,
    completed: Boolean(data.completed ?? (target > 0 && done >= target)),
    weekStart: data.weekStart ?? null,
    weekEnd: data.weekEnd ?? null,
  };
}
