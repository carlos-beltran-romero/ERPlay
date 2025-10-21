// back/src/services/progress.service.ts
import { AppDataSource } from '../data-source';
import { TestSession } from '../models/TestSession';
import { TestResult } from '../models/TestResult';
import { Claim, ClaimStatus } from '../models/Claim';
import { UserBadge } from '../models/UserBadge';
import { Question } from '../models/Question';
import { WeeklyGoal } from '../models/WeeklyGoal';



/**
 * Resumen de progreso
 */
export async function getOverview(userId: string) {
  const rRepo = AppDataSource.getRepository(TestResult);
  const sRepo = AppDataSource.getRepository(TestSession);

  // Base: resultados del usuario (join por relación)
  const baseQB = rRepo
    .createQueryBuilder('r')
    .innerJoin('r.session', 's')
    .innerJoin('s.user', 'u')
    .where('u.id = :userId', { userId });

  // Acierto en learning (%)
  const accRow =
    (await baseQB
      .clone()
      .andWhere("s.mode = 'learning'")
      .select('SUM(CASE WHEN r.isCorrect = 1 THEN 1 ELSE 0 END)', 'ok')
      .addSelect('COUNT(*)', 'tot')
      .getRawOne<{ ok: string; tot: string }>()) ?? { ok: '0', tot: '0' };

  const accuracyLearningPct = Number(accRow.tot) ? (Number(accRow.ok) / Number(accRow.tot)) * 100 : 0;

  // Nota media en exam (0..10)
  const examRow =
    (await baseQB
      .clone()
      .andWhere("s.mode = 'exam'")
      .select('SUM(CASE WHEN r.isCorrect = 1 THEN 1 ELSE 0 END)', 'ok')
      .addSelect('COUNT(*)', 'tot')
      .getRawOne<{ ok: string; tot: string }>()) ?? { ok: '0', tot: '0' };

  const examPct = Number(examRow.tot) ? (Number(examRow.ok) / Number(examRow.tot)) * 100 : 0;
  const examScoreAvg = Number(examRow.tot) ? (Number(examRow.ok) / Number(examRow.tot)) * 10 : 0;

  // Tiempo medio por pregunta (segundos)
  const avgRow =
    (await baseQB
      .clone()
      .select('AVG(r.timeSpentSeconds)', 'avg')
      .getRawOne<{ avg: string }>()) ?? { avg: '0' };

  // Sesiones completadas
  const compRow =
    (await sRepo
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s.completedAt IS NOT NULL')
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  // Total respondidas
  const totRow =
    (await baseQB.clone().select('COUNT(*)', 'cnt').getRawOne<{ cnt: string }>()) ?? { cnt: '0' };

  // Mejor racha (días consecutivos con actividad)
  const streakRows = await baseQB
    .clone()
    .select('DATE(r.createdAt)', 'd')
    .addSelect('COUNT(*)', 'cnt')
    .groupBy('d')
    .orderBy('d', 'ASC')
    .getRawMany<{ d: string; cnt: string }>();

  const bestStreakDays = calcBestStreak(streakRows.map((r) => r.d));

  return {
    accuracyLearningPct,
    examScoreAvg,
    answeredCount: Number(totRow.cnt ?? 0),
    avgTimePerQuestionSec: Number(avgRow.avg ?? 0),
    sessionsCompleted: Number(compRow.cnt ?? 0),
    deltaExamVsLearningPts: examPct - accuracyLearningPct,
    bestStreakDays,
  };
}

/**
 * Tendencias por día/semana
 */
export async function getTrends(params: { userId: string; from?: string; to?: string; bucket: 'day' | 'week' }) {
  const { userId, from, to, bucket } = params;
  const rRepo = AppDataSource.getRepository(TestResult);

  // Expresión base de fecha
  const baseDateExpr =
    bucket === 'week'
      ? "STR_TO_DATE(CONCAT(YEARWEEK(r.createdAt, 3),' Monday'), '%X%V %W')" // lunes ISO
      : 'DATE(r.createdAt)';

  // Forzamos string YYYY-MM-DD para evitar r.bucket como Date
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
      bucket: string; // ahora garantizado string 'YYYY-MM-DD'
      okLearn: string;
      totLearn: string;
      okExam: string;
      totExam: string;
      okAll: string;
      totAll: string;
    }>();

  return rows.map((r) => ({
    date: r.bucket, // ya es 'YYYY-MM-DD'
    accuracyLearningPct: Number(r.totLearn) ? (Number(r.okLearn) / Number(r.totLearn)) * 100 : null,
    examScorePct: Number(r.totExam) ? (Number(r.okExam) / Number(r.totExam)) * 100 : null,
    correctCount: Number(r.okAll),
    incorrectCount: Math.max(0, Number(r.totAll) - Number(r.okAll)),
  }));
}

/**
 * Top errores por pregunta
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
    // Ordenar por tasa de error (expresión completa, no alias)
    .orderBy(
      'SUM(CASE WHEN r.isCorrect = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)',
      'DESC'
    )
    .addOrderBy('COUNT(*)', 'DESC')
    .limit(limit)
    .getRawMany<{ id: string; title: string; tot: string; ko: string }>();

  // Índice más elegido (entre respuestas incorrectas), por pregunta
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
    errorRatePct: Number(r.tot) ? (Number(r.ko) / Number(r.tot)) * 100 : 0,
    commonChosenIndex: commonIndexByQ[r.id],
  }));
}

/**
 * Hábitos (por hora del día, duración media de sesión, hints)
 */
export async function getHabits(userId: string) {
  // Distribución por hora del día
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

  // Duración media por sesión (usa s.durationSeconds)
  const avgSessionRow =
    (await AppDataSource.getRepository(TestSession)
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s.completedAt IS NOT NULL')
      .andWhere('s.durationSeconds IS NOT NULL')
      .select('AVG(s.durationSeconds)', 'avg')
      .getRawOne<{ avg: string }>()) ?? { avg: '0' };

  // Porcentaje de uso de pistas en learning
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
    avgSessionDurationSec: Number(avgSessionRow.avg ?? 0),
    hintsPerQuestionPct: Number(hintRow.tot) ? (Number(hintRow.hints) / Number(hintRow.tot)) * 100 : 0,
  };
}

/**
 * Reclamaciones (enviadas / aprobadas)
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

// Devuelve el progreso semanal del usuario actual, mismo shape que usa supervisor
export async function getWeeklyProgressRow(userId: string) {
  const goalRepo = AppDataSource.getRepository(WeeklyGoal);

  // Objetivo activo de la semana (ajusta si tu lógica es distinta)
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


// ---- helpers ----
function calcBestStreak(datesISO: string[]): number {
  if (!datesISO.length) return 0;
  const set = new Set(datesISO);
  let best = 1;
  for (const d of set) {
    const prev = new Date(d);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevISO = prev.toISOString().slice(0, 10);
    if (!set.has(prevISO)) {
      // inicio de racha
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
  let cur = new Date(); // hoy
  while (true) {
    const iso = cur.toISOString().slice(0, 10);
    if (set.has(iso)) streak++;
    else break;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

export async function getBadges(userId: string): Promise<Array<{
  id: string;
  label: string;
  weekStart: string;
  weekEnd: string;
  earnedAt: string | null;
}>> {
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
    // nº de sesiones completadas por el usuario en la semana (inclusive)
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
        earnedAt: g.weekEnd, // puedes cambiar a null si prefieres
      });
    }
  }

  return out;
}
