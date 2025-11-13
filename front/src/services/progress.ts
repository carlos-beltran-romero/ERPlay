/**
 * Módulo de servicios de progreso del estudiante
 * Gestiona métricas personales, tendencias, objetivos y logros
 * @module front/services/progress
 *
 * IMPORTANTE:
 * - NO concatenes API_URL aquí. Usa SIEMPRE paths relativos: '/api/...'
 * - http.ts se encarga de anteponer env.API_URL (local o Docker) y normalizar.
 */

import { apiJson } from './http';

async function getJSON(path: string, fallbackError = 'Error de servidor') {
  return apiJson<any>(path, { auth: true, fallbackError });
}

function uid(): string {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}

/** KPIs principales del estudiante */
export type Overview = {
  accuracyLearningPct: number;
  examScoreAvg: number;
  answeredCount: number;
  avgTimePerQuestionSec: number;
  sessionsCompleted: number;
  deltaExamVsLearningPts: number;
  bestStreakDays: number;
};

/** Progreso semanal de un estudiante */
export type WeeklyProgressRow = {
  userId: string;
  name?: string;
  email?: string;
  done: number;
  target: number;
  pct: number;
  completed: boolean;
  weekStart?: string | null;
  weekEnd?: string | null;
};

/** Insignia ganada por cumplir objetivos */
export type BadgeItem = {
  id: string;
  label: string;
  weekStart?: string | null;
  weekEnd?: string | null;
  earnedAt?: string | null;
};

/** Pregunta problemática del estudiante */
export type ErrorItem = {
  id: string;
  title: string;
  errorRatePct: number;
  commonChosenIndex?: number;
  commonChosenText?: string;
};

/** Punto de serie temporal para gráficas */
export type TrendPoint = {
  date: string;
  accuracyLearningPct?: number;
  examScorePct?: number;
  correctCount?: number;
  incorrectCount?: number;
};

/** Patrones de uso y hábitos de estudio */
export type Habits = {
  byHour: { hour: number; answered: number }[];
  avgSessionDurationSec: number;
  hintsPerQuestionPct: number;
};

/** Estadísticas de reclamaciones */
export type ClaimsStats = { submitted: number; approved: number };

/** Objetivo semanal y racha actual */
export type Goal = {
  weeklyTargetQuestions: number;
  weekAnswered: number;
  currentStreakDays: number;
};

/** Pregunta creada por el estudiante */
export type MyQuestionItem = {
  id: string;
  title: string;
  status: 'approved' | 'rejected' | 'pending';
  reviewedAt?: string | null;
  reviewerName?: string | null;
};

/**
 * Obtiene resumen general de progreso
 */
export async function getOverview(): Promise<Overview> {
  const data = await getJSON('/api/progress/overview');
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

/**
 * Obtiene tendencias temporales de rendimiento
 */
export async function getTrends(params?: { from?: string; to?: string; bucket?: 'day' | 'week' }) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.bucket) q.set('bucket', params.bucket);
  const url = `/api/progress/trends${q.toString() ? `?${q.toString()}` : ''}`;

  const data = await apiJson<any>(url, {
    auth: true,
    fallbackError: 'No se pudieron cargar tendencias',
  });

  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((d) => ({
    date: String(d.date ?? d.day ?? d.bucket ?? ''),
    accuracyLearningPct: d.accuracyLearningPct ?? d.accLearningPct ?? undefined,
    examScorePct: d.examScorePct ?? d.examPct ?? undefined,
    correctCount: Number(d.correctCount ?? d.correct ?? 0),
    incorrectCount: Number(d.incorrectCount ?? d.incorrect ?? 0),
  })) as TrendPoint[];
}

/**
 * Lista preguntas con mayor tasa de error
 */
export async function getErrors(limit = 5): Promise<ErrorItem[]> {
  const data = await apiJson<any>(`/api/progress/errors?limit=${encodeURIComponent(limit)}`, {
    auth: true,
    fallbackError: 'No se pudieron cargar errores',
  });
  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((e) => ([
    String(e.id ?? e.questionId ?? uid()),
    String(e.title ?? e.prompt ?? 'Pregunta'),
    Number(e.errorRatePct ?? e.errorPct ?? 0),
    ((): number | undefined => {
      const v = e.commonChosenIndex;
      if (typeof v === 'number') return v;
      if (v != null) return Number(v);
      return undefined;
    })(),
    e.commonChosenText ? String(e.commonChosenText) : undefined,
  ])).map(([id, title, errorRatePct, commonChosenIndex, commonChosenText]) => ({
    id, title, errorRatePct, commonChosenIndex, commonChosenText
  } as ErrorItem));
}

/**
 * Obtiene patrones de uso y hábitos de estudio
 */
export async function getHabits(): Promise<Habits> {
  const data = await getJSON('/api/progress/habits');
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

/**
 * Obtiene estadísticas de reclamaciones
 */
export async function getClaimsStats(): Promise<ClaimsStats> {
  const data = await getJSON('/api/progress/claims');
  return { submitted: Number(data.submitted ?? 0), approved: Number(data.approved ?? 0) };
}

/**
 * Obtiene objetivo semanal y progreso actual
 */
export async function getGoal(): Promise<Goal> {
  const data = await getJSON('/api/progress/goal');
  return {
    weeklyTargetQuestions: Number(data.weeklyTargetQuestions ?? data.target ?? 0),
    weekAnswered: Number(data.weekAnswered ?? data.answered ?? 0),
    currentStreakDays: Number(data.currentStreakDays ?? data.streak ?? 0),
  };
}

/**
 * Lista insignias ganadas por el estudiante
 */
export async function getBadges(): Promise<BadgeItem[]> {
  const data = await apiJson<any>('/api/progress/badges', {
    auth: true,
    fallbackError: 'No se pudieron cargar insignias',
  });
  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((b) => ({
    id: String(b.id ?? uid()),
    label: String(b.label ?? b.name ?? 'Insignia'),
    earnedAt: b.earnedAt ?? b.at ?? undefined,
  }));
}

/**
 * Obtiene texto de una opción de pregunta
 */
export async function getQuestionOptionText(questionId: string, optionIndex: number): Promise<string | null> {
  const data = await apiJson<any>(`/api/questions/${encodeURIComponent(questionId)}`, {
    auth: true,
    fallbackError: 'No se pudo obtener la pregunta',
  });
  if (!data) return null;
  const options = Array.isArray(data.options) ? data.options : [];
  const found = options.find((o: any) => Number(o.orderIndex) === Number(optionIndex));
  return found?.text ?? null;
}

/**
 * Lista preguntas creadas por el estudiante (compatibilidad endpoints)
 */
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
    const data = await apiJson<any>(url, {
      auth: true,
      fallbackError: 'No se pudo cargar "mis preguntas"',
    });
    const arr = Array.isArray(data) ? data : (data.items || data.results || []);
    return (arr as any[]).map((q) => ({
      id: String(q.id),
      title: String(q.title ?? q.prompt ?? 'Pregunta'),
      status: (q.status ?? q.reviewStatus ?? 'pending').toLowerCase(),
      reviewedAt: q.reviewedAt ?? q.review_date ?? q.updatedAt ?? null,
      reviewerName: q.reviewer?.name ?? q.reviewerName ?? null,
    })) as MyQuestionItem[];
  }

  try { return await hit(`/api/progress/my-questions?${qs.toString()}`); } catch {}
  try { return await hit(`/api/questions/mine?${qs.toString()}`); } catch {}
  return await hit(`/api/questions?createdBy=me&${qs.toString()}`);
}

/**
 * Actualiza objetivo semanal del estudiante
 */
export async function updateGoal(payload: { weeklyTargetQuestions: number }) : Promise<Goal> {
  const data = await apiJson<any>('/api/progress/goal', {
    method: 'PUT',
    auth: true,
    json: payload,
    fallbackError: 'No se pudo actualizar el objetivo',
  });
  return {
    weeklyTargetQuestions: Number(data.weeklyTargetQuestions ?? data.target ?? payload.weeklyTargetQuestions),
    weekAnswered: Number(data.weekAnswered ?? data.answered ?? 0),
    currentStreakDays: Number(data.currentStreakDays ?? data.streak ?? 0),
  };
}

/**
 * Alias de getBadges para compatibilidad
 * @deprecated Usar getBadges directamente
 */
export async function getMyBadges(): Promise<BadgeItem[]> {
  const data = await getJSON('/api/progress/badges');
  return Array.isArray(data) ? data : [];
}

/**
 * Obtiene progreso semanal del estudiante autenticado
 */
export async function getMyWeeklyProgress(): Promise<WeeklyProgressRow | null> {
  const urls = [
    '/api/progress/weekly-progress',
    '/api/progress/weekly-goal/progress',
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
