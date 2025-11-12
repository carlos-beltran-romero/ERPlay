/**
 * Módulo de servicios de progreso del estudiante
 * Gestiona métricas personales, tendencias, objetivos y logros
 * @module front/services/progress
 */

import { apiJson, API_URL } from './http';

async function getJSON(url: string, fallbackError = 'Error de servidor') {
  return apiJson<any>(url, { auth: true, fallbackError });
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
 * @returns KPIs principales (precisión, nota media, respuestas totales, racha)
 * @remarks Normaliza formatos legacy del backend (learningAccuracyPct vs accuracyLearningPct)
 */
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

/**
 * Obtiene tendencias temporales de rendimiento
 * @param params - Rango de fechas y granularidad (day/week)
 * @returns Serie temporal de precisión y nota
 * @remarks Útil para gráficas de evolución histórica
 */
export async function getTrends(params?: { from?: string; to?: string; bucket?: 'day' | 'week' }) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.bucket) q.set('bucket', params.bucket);
  const url = `${API_URL}/api/progress/trends${q.toString() ? `?${q.toString()}` : ''}`;

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
 * @param limit - Máximo de preguntas a retornar (default: 5)
 * @returns Array ordenado por errorRatePct descendente
 * @remarks Identifica puntos débiles para repaso dirigido
 */
export async function getErrors(limit = 5): Promise<ErrorItem[]> {
  const data = await apiJson<any>(`${API_URL}/api/progress/errors?limit=${limit}`, {
    auth: true,
    fallbackError: 'No se pudieron cargar errores',
  });
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

/**
 * Obtiene patrones de uso y hábitos de estudio
 * @returns Distribución horaria, duración promedio de sesiones y uso de pistas
 * @remarks byHour: Array de 24 elementos (0=00:00, 23=23:00)
 */
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

/**
 * Obtiene estadísticas de reclamaciones
 * @returns Total enviadas y aprobadas
 */
export async function getClaimsStats(): Promise<ClaimsStats> {
  const data = await getJSON(`${API_URL}/api/progress/claims`);
  return { submitted: Number(data.submitted ?? 0), approved: Number(data.approved ?? 0) };
}

/**
 * Obtiene objetivo semanal y progreso actual
 * @returns Meta, respuestas completadas y racha de días
 */
export async function getGoal(): Promise<Goal> {
  const data = await getJSON(`${API_URL}/api/progress/goal`);
  return {
    weeklyTargetQuestions: Number(data.weeklyTargetQuestions ?? data.target ?? 0),
    weekAnswered: Number(data.weekAnswered ?? data.answered ?? 0),
    currentStreakDays: Number(data.currentStreakDays ?? data.streak ?? 0),
  };
}

/**
 * Lista insignias ganadas por el estudiante
 * @returns Array de badges ordenados por fecha de obtención
 * @remarks Incluye insignias semanales y de logros especiales
 */
export async function getBadges(): Promise<BadgeItem[]> {
  const data = await apiJson<any>(`${API_URL}/api/progress/badges`, {
    auth: true,
    fallbackError: 'No se pudieron cargar insignias',
  });
  const arr = Array.isArray(data) ? data : (data.items || []);
  return (arr as any[]).map((b) => ({
    id: String(b.id ?? crypto.randomUUID()),
    label: String(b.label ?? b.name ?? 'Insignia'),
    earnedAt: b.earnedAt ?? b.at ?? undefined,
  }));
}

/**
 * Obtiene texto de una opción de pregunta
 * @param questionId - ID de la pregunta
 * @param optionIndex - Índice 0-based de la opción
 * @returns Texto de la opción o null si no existe
 * @remarks Usado para mostrar respuestas comunes erróneas
 */
export async function getQuestionOptionText(questionId: string, optionIndex: number): Promise<string | null> {
  const data = await apiJson<any>(`${API_URL}/api/questions/${questionId}`, {
    auth: true,
    fallbackError: 'No se pudo obtener la pregunta',
  });
  if (!data) return null;
  const options = Array.isArray(data.options) ? data.options : [];
  const found = options.find((o: any) => Number(o.orderIndex) === Number(optionIndex));
  return found?.text ?? null;
}

/**
 * Lista preguntas creadas por el estudiante
 * @param params - Filtros de paginación y estado
 * @returns Array de preguntas con estado de revisión
 * @remarks Intenta múltiples endpoints para compatibilidad con backend legacy
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

  try { return await hit(`${API_URL}/api/progress/my-questions?${qs.toString()}`); } catch {}
  try { return await hit(`${API_URL}/api/questions/mine?${qs.toString()}`); } catch {}
  return await hit(`${API_URL}/api/questions?createdBy=me&${qs.toString()}`);
}

/**
 * Actualiza objetivo semanal del estudiante
 * @param payload - Nueva meta de preguntas por semana
 * @returns Objetivo actualizado con progreso actual
 */
export async function updateGoal(payload: { weeklyTargetQuestions: number }) : Promise<Goal> {
  const data = await apiJson<any>(`${API_URL}/api/progress/goal`, {
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
  const data = await getJSON(`${API_URL}/api/progress/badges`);
  return Array.isArray(data) ? data : [];
}

/**
 * Obtiene progreso semanal del estudiante autenticado
 * @returns Progreso actual o null si no hay objetivo activo
 * @remarks Intenta múltiples endpoints para compatibilidad
 */
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