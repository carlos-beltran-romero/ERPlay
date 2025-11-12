/**
 * Módulo de servicio de progreso del estudiante
 * Proporciona métricas de rendimiento, tendencias temporales y análisis de hábitos
 * @module services/progress
 */

import { AppDataSource } from '../data-source';
import { TestSession } from '../models/TestSession';
import { TestResult } from '../models/TestResult';
import { Claim, ClaimStatus } from '../models/Claim';
import { WeeklyGoal } from '../models/WeeklyGoal';

/**
 * Resumen general de progreso del estudiante
 * Calcula KPIs principales de rendimiento académico
 * 
 * @param userId - ID del estudiante
 * @returns Objeto con métricas agregadas
 * @remarks
 * - accuracyLearningPct: Precisión en modo práctica (0-100%)
 * - examScoreAvg: Nota media en exámenes (0-10)
 * - answeredCount: Total de preguntas respondidas (excluye omitidas)
 * - avgTimePerQuestionSec: Tiempo promedio por pregunta en segundos
 * - sessionsCompleted: Sesiones finalizadas con completedAt != NULL
 * - deltaExamVsLearningPts: Diferencia entre precisión en examen y práctica
 * - bestStreakDays: Racha más larga de días consecutivos con actividad
 */
export async function getOverview(userId: string) {
  const rRepo = AppDataSource.getRepository(TestResult);
  const sRepo = AppDataSource.getRepository(TestSession);


  const baseQB = rRepo
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .where('u.id = :userId', { userId });

  const accRow =
    (await baseQB
      .clone()
      .andWhere("s.mode = 'learning'")
      .select('SUM(CASE WHEN r.isCorrect = 1 THEN 1 ELSE 0 END)', 'ok')
      .addSelect('COUNT(*)', 'tot')
      .getRawOne<{ ok: string; tot: string }>()) ?? { ok: '0', tot: '0' };

  const accuracyLearningPct = Number(accRow.tot) ? (Number(accRow.ok) / Number(accRow.tot)) * 100 : 0;

  const examRow =
    (await baseQB
      .clone()
      .andWhere("s.mode = 'exam'")
      .select('SUM(CASE WHEN r.isCorrect = 1 THEN 1 ELSE 0 END)', 'ok')
      .addSelect('COUNT(*)', 'tot')
      .getRawOne<{ ok: string; tot: string }>()) ?? { ok: '0', tot: '0' };

  const examPct = Number(examRow.tot) ? (Number(examRow.ok) / Number(examRow.tot)) * 100 : 0;
  const examScoreAvg = Number(examRow.tot) ? (Number(examRow.ok) / Number(examRow.tot)) * 10 : 0;

  const avgRow =
    (await baseQB
      .clone()
      .select('AVG(r.timeSpentSeconds)', 'avg')
      .getRawOne<{ avg: string }>()) ?? { avg: '0' };

  const compRow =
    (await sRepo
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s.completedAt IS NOT NULL')
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  const totRow =
    (await baseQB
      .clone()
      .andWhere('r.selectedIndex IS NOT NULL')
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  const streakRows = await baseQB
    .clone()
    .select('DATE(r.createdAt)', 'd')
    .addSelect('COUNT(*)', 'cnt')
    .groupBy('d')
    .orderBy('d', 'ASC')
    .getRawMany<{ d: string; cnt: string }>();

  const bestStreakDays = calcBestStreak(streakRows.map((r) => r.d));

  return {
    accuracyLearningPct: Math.round(accuracyLearningPct * 10) / 10,
    examScoreAvg: Math.round(examScoreAvg * 100) / 100,
    answeredCount: Number(totRow.cnt ?? 0),
    avgTimePerQuestionSec: Math.round(Number(avgRow.avg ?? 0) * 100) / 100,
    sessionsCompleted: Number(compRow.cnt ?? 0),
    deltaExamVsLearningPts: Math.round((examPct - accuracyLearningPct) * 10) / 10,
    bestStreakDays,
  };
}

/**
 * Tendencias temporales de rendimiento
 * Agrupa métricas por día o semana según el bucket especificado
 * 
 * @param params - Parámetros de consulta
 * @param params.userId - ID del estudiante
 * @param params.from - Fecha inicio (YYYY-MM-DD) opcional
 * @param params.to - Fecha fin (YYYY-MM-DD) opcional
 * @param params.bucket - Granularidad temporal: 'day' o 'week'
 * @returns Array de puntos temporales con métricas
 * @remarks
 * - Bucket 'week' agrupa por semanas ISO (lunes como inicio)
 * - Todas las fechas se devuelven en formato YYYY-MM-DD
 * - accuracyLearningPct: % acierto en modo learning
 * - examScorePct: % acierto en modo exam (0-100, no 0-10)
 * - correctCount/incorrectCount: Contadores absolutos
 */
export async function getTrends(params: { userId: string; from?: string; to?: string; bucket: 'day' | 'week' }) {
  const { userId, from, to, bucket } = params;
  const rRepo = AppDataSource.getRepository(TestResult);

  const baseDateExpr =
    bucket === 'week'
      ? "STR_TO_DATE(CONCAT(YEARWEEK(r.createdAt, 3),' Monday'), '%X%V %W')" // Semana ISO (modo 3)
      : 'DATE(r.createdAt)';
  const dateExpr = `DATE_FORMAT(${baseDateExpr}, '%Y-%m-%d')`;

  const qb = rRepo
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .where('u.id = :userId', { userId });
  if (from) qb.andWhere('r.createdAt >= :from', { from: `${from} 00:00:00` });
  if (to) qb.andWhere('r.createdAt <= :to', { to: `${to} 23:59:59` });

  const rows = await qb
    .select(dateExpr, 'bucket')
    .addSelect("SUM(CASE WHEN s.mode = 'learning' AND r.isCorrect = 1 THEN 1 ELSE 0 END)", 'okLearn')
    .addSelect("SUM(CASE WHEN s.mode = 'learning' THEN 1 ELSE 0 END)", 'totLearn')
    .addSelect("SUM(CASE WHEN s.mode = 'exam' AND r.isCorrect = 1 THEN 1 ELSE 0 END)", 'okExam')
    .addSelect("SUM(CASE WHEN s.mode = 'exam' THEN 1 ELSE 0 END)", 'totExam')
    .addSelect('SUM(CASE WHEN r.isCorrect = 1 THEN 1 ELSE 0 END)', 'okAll')
    .addSelect('COUNT(*)', 'totAll')
    .groupBy('bucket')
    .orderBy('bucket', 'ASC')
    .getRawMany<{
      bucket: string;
      okLearn: string;
      totLearn: string;
      okExam: string;
      totExam: string;
      okAll: string;
      totAll: string;
    }>();

  return rows.map((r) => ({
    date: r.bucket,
    accuracyLearningPct: Number(r.totLearn) ? Math.round((Number(r.okLearn) / Number(r.totLearn)) * 1000) / 10 : null,
    examScorePct: Number(r.totExam) ? Math.round((Number(r.okExam) / Number(r.totExam)) * 1000) / 10 : null,
    correctCount: Number(r.okAll),
    incorrectCount: Math.max(0, Number(r.totAll) - Number(r.okAll)),
  }));
}

/**
 * Análisis de errores frecuentes por pregunta
 * Identifica preguntas problemáticas y distractores comunes
 * 
 * @param params - Parámetros de consulta
 * @param params.userId - ID del estudiante
 * @param params.limit - Número máximo de preguntas a retornar
 * @param params.minAttempts - Intentos mínimos requeridos para incluir la pregunta
 * @returns Array de preguntas ordenadas por tasa de error descendente
 * @remarks
 * - Filtra preguntas con >= minAttempts intentos
 * - errorRatePct: Porcentaje de respuestas incorrectas
 * - commonChosenIndex: Índice del distractor más elegido (entre errores)
 * - title: Primeros 60 caracteres del enunciado
 */
export async function getErrors(params: { userId: string; limit: number; minAttempts: number }) {
  const { userId, limit, minAttempts } = params;

  const rows = await AppDataSource.getRepository(TestResult)
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .leftJoin('r.question', 'q')
    .where('u.id = :userId', { userId })
    .andWhere('r.question IS NOT NULL')
    .select('q.id', 'id')
    .addSelect("COALESCE(SUBSTRING(q.prompt,1,60), 'Pregunta')", 'title')
    .addSelect('COUNT(*)', 'tot')
    .addSelect('SUM(CASE WHEN r.isCorrect = 0 THEN 1 ELSE 0 END)', 'ko')
    .groupBy('q.id')
    .having('COUNT(*) >= :minAttempts', { minAttempts })
    .orderBy('SUM(CASE WHEN r.isCorrect = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)', 'DESC')
    .addOrderBy('COUNT(*)', 'DESC')
    .limit(limit)
    .getRawMany<{ id: string; title: string; tot: string; ko: string }>();
  const ids = rows.map((r) => r.id).filter(Boolean);
  let commonIndexByQ: Record<string, number | undefined> = {};

  if (ids.length) {
    const freqRows = await AppDataSource.getRepository(TestResult)
      .createQueryBuilder('r')
      .innerJoin('r.session', 's')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('r.question IN (:...ids)', { ids })
      .andWhere('r.selectedIndex IS NOT NULL')
      .andWhere('r.isCorrect = 0')
      .select('r.question', 'qid')
      .addSelect('r.selectedIndex', 'idx')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('qid')
      .addGroupBy('idx')
      .orderBy('qid', 'ASC')
      .addOrderBy('cnt', 'DESC')
      .getRawMany<{ qid: string; idx: string; cnt: string }>();
    for (const row of freqRows) {
      if (commonIndexByQ[row.qid] == null) commonIndexByQ[row.qid] = Number(row.idx);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    errorRatePct: Math.round((Number(r.ko) / Number(r.tot)) * 1000) / 10,
    commonChosenIndex: commonIndexByQ[r.id],
  }));
}

/**
 * Análisis de hábitos de estudio
 * Identifica patrones temporales y uso de recursos de ayuda
 * 
 * @param userId - ID del estudiante
 * @returns Objeto con distribución horaria, duración promedio y uso de pistas
 * @remarks
 * - byHour: Array de 24 elementos (0-23h) con contador de preguntas por hora
 * - avgSessionDurationSec: Duración media de sesiones completadas
 * - hintsPerQuestionPct: % de preguntas en las que se usó pista (solo mode=learning)
 */
export async function getHabits(userId: string) {
  const rows = await AppDataSource.getRepository(TestResult)
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .where('u.id = :userId', { userId })
    .select('HOUR(r.createdAt)', 'hour')
    .addSelect('COUNT(*)', 'answered')
    .groupBy('hour')
    .orderBy('hour', 'ASC')
    .getRawMany<{ hour: string; answered: string }>();
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const f = rows.find((r) => Number(r.hour) === h);
    return { hour: h, answered: Number(f?.answered ?? 0) };
  });
  const avgSessionRow =
    (await AppDataSource.getRepository(TestSession)
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s.completedAt IS NOT NULL')
      .andWhere('s.durationSeconds IS NOT NULL')
      .select('AVG(s.durationSeconds)', 'avg')
      .getRawOne<{ avg: string }>()) ?? { avg: '0' };
  const hintRow =
    (await AppDataSource.getRepository(TestResult)
      .createQueryBuilder('r')
      .innerJoin('r.session', 's')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere("s.mode = 'learning'")
      .select('SUM(CASE WHEN r.usedHint = 1 THEN 1 ELSE 0 END)', 'hints')
      .addSelect('COUNT(*)', 'tot')
      .getRawOne<{ hints: string; tot: string }>()) ?? { hints: '0', tot: '0' };

  return {
    byHour,
    avgSessionDurationSec: Math.round(Number(avgSessionRow.avg ?? 0)),
    hintsPerQuestionPct: Number(hintRow.tot) ? Math.round((Number(hintRow.hints) / Number(hintRow.tot)) * 1000) / 10 : 0,
  };
}

/**
 * Estadísticas de reclamaciones del estudiante
 * 
 * @param userId - ID del estudiante
 * @returns Contadores de reclamaciones enviadas y aprobadas
 */
export async function getClaimsStats(userId: string) {
  const cRepo = AppDataSource.getRepository(Claim);

  const submittedRow =
    (await cRepo
      .createQueryBuilder('c')
      .innerJoin('c.student', 'u')
      .where('u.id = :userId', { userId })
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  const approvedRow =
    (await cRepo
      .createQueryBuilder('c')
      .innerJoin('c.student', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('c.status = :st', { st: ClaimStatus.APPROVED })
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  return { submitted: Number(submittedRow.cnt ?? 0), approved: Number(approvedRow.cnt ?? 0) };
}

/**
 * Progreso hacia el objetivo semanal
 * 
 * @param userId - ID del estudiante
 * @returns Progreso de la semana actual o null si no hay objetivo activo
 * @remarks
 * - target: Sesiones objetivo de la semana
 * - done: Sesiones completadas en el rango
 * - pct: Porcentaje de completitud (0-100+)
 * - completed: true si done >= target
 */
export async function getWeeklyProgressRow(userId: string) {
  const goalRepo = AppDataSource.getRepository(WeeklyGoal);
  const g = await goalRepo
    .createQueryBuilder('g')
    .where('DATE(g.weekStart) <= CURRENT_DATE()')
    .andWhere('DATE(g.weekEnd) >= CURRENT_DATE()')
    .orderBy('g.weekStart', 'DESC')
    .getOne();

  if (!g) return null;

  const { count } = await AppDataSource.getRepository(TestSession)
    .createQueryBuilder('s')
    .innerJoin('s.user', 'u')
    .where('u.id = :uid', { uid: userId })
    .andWhere('s.completedAt IS NOT NULL')
    .andWhere('DATE(s.completedAt) >= :s', { s: g.weekStart })
    .andWhere('DATE(s.completedAt) <= :e', { e: g.weekEnd })
    .select('COUNT(*)', 'count')
    .getRawOne<{ count: string }>();

  const done = Number(count || 0);
  const target = Number(g.targetTests || 0);
  const pct = target > 0 ? Math.round((done / target) * 100) : 0;

  return {
    userId,
    target,
    done,
    pct,
    completed: target > 0 && done >= target,
    weekStart: g.weekStart,
    weekEnd: g.weekEnd,
  };
}

/**
 * Insignias (badges) obtenidas por el estudiante
 * Basadas en objetivos semanales completados
 * 
 * @param userId - ID del estudiante
 * @returns Array de insignias ganadas, ordenadas cronológicamente
 * @remarks
 * - Se genera una insignia por cada semana donde se cumplió el objetivo
 * - earnedAt se establece como el último día de la semana
 */
export async function getBadges(userId: string): Promise<
  Array<{
    id: string;
    label: string;
    weekStart: string;
    weekEnd: string;
    earnedAt: string | null;
  }>
> {
  const goalRepo = AppDataSource.getRepository(WeeklyGoal);
  const goals = await goalRepo.find({ order: { weekStart: 'ASC' } });
  if (!goals.length) return [];

  const out: Array<{
    id: string;
    label: string;
    weekStart: string;
    weekEnd: string;
    earnedAt: string | null;
  }> = [];

  for (const g of goals) {
    const { count } = await AppDataSource.getRepository(TestSession)
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .innerJoin('s.user', 'u')
      .where('u.id = :uid', { uid: userId })
      .andWhere('s.completedAt IS NOT NULL')
      .andWhere('DATE(s.completedAt) >= :s', { s: g.weekStart })
      .andWhere('DATE(s.completedAt) <= :e', { e: g.weekEnd })
      .getRawOne<{ count: string }>();

    const done = Number(count || 0);
    if (g.targetTests > 0 && done >= g.targetTests) {
      out.push({
        id: `${g.weekStart}_${g.weekEnd}`,
        label: `Semana ${g.weekStart} — ${g.weekEnd}`,
        weekStart: g.weekStart,
        weekEnd: g.weekEnd,
        earnedAt: g.weekEnd,
      });
    }
  }

  return out;
}

/**
 * Calcula la racha más larga de días consecutivos con actividad
 * 
 * @param datesISO - Array de fechas en formato YYYY-MM-DD
 * @returns Longitud máxima de racha encontrada
 * @remarks
 * - Algoritmo: Para cada fecha sin día anterior, cuenta días consecutivos hacia adelante
 * - Complejidad: O(n²) en peor caso, pero eficiente para conjuntos pequeños
 */
function calcBestStreak(datesISO: string[]): number {
  if (!datesISO.length) return 0;
  const set = new Set(datesISO);
  let best = 1;

  for (const d of set) {
    const prev = new Date(d);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevISO = prev.toISOString().slice(0, 10);
    if (!set.has(prevISO)) {
      let len = 1;
      let cur = new Date(d);

      while (true) {
        cur.setUTCDate(cur.getUTCDate() + 1);
        const iso = cur.toISOString().slice(0, 10);
        if (set.has(iso)) len++;
        else break;
      }

      best = Math.max(best, len);
    }
  }

  return best;
}

/**
 * Calcula la racha actual de días consecutivos (hasta hoy)
 * NOTA: Función no utilizada actualmente, mantenida para extensiones futuras
 * 
 * @param userId - ID del estudiante
 * @returns Longitud de racha actual
 */
async function calcCurrentStreak(userId: string): Promise<number> {
  const rows = await AppDataSource.getRepository(TestResult)
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .where('u.id = :userId', { userId })
    .select('DATE(r.createdAt)', 'd')
    .groupBy('d')
    .orderBy('d', 'DESC')
    .getRawMany<{ d: string }>();

  if (!rows.length) return 0;

  const set = new Set(rows.map((r) => r.d));
  let streak = 0;
  let cur = new Date();

  while (true) {
    const iso = cur.toISOString().slice(0, 10);
    if (set.has(iso)) streak++;
    else break;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  return streak;
}