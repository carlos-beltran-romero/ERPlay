/**
 * Módulo de servicio de estadísticas de diagramas
 * Calcula KPIs, tendencias y análisis psicométricos avanzados
 * @module services/diagramStats
 */

import { Between, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../data-source";
import { TestSession } from "../models/TestSession";
import { TestResult } from "../models/TestResult";
import { Claim, ClaimStatus } from "../models/Claim";
import { Rating } from "../models/Rating";

/** KPIs principales del diagrama */
export type DiagramKpis = {
  examScoreAvg10: number;
  learningAccuracyPct: number;
  masteryRatePct: number;
  atRiskRatePct: number;
  practiceToExamDeltaPts: number;
  medianTimePerQuestionExamSec: number;
  hintUsagePct: number;
  errorConcentrationTop5Pct?: number;
};

/** Punto en tendencia temporal */
export type TrendPoint = {
  date: string;
  examScorePct?: number | null;
  learningAccuracyPct?: number | null;
};

/** Bucket de histograma de notas */
export type HistogramBucket = { label: string; count: number };

/** Punto en scatter precisión vs velocidad */
export type ScatterPoint = {
  studentId?: string;
  name?: string | null;
  accuracyPct: number;
  timeSecPerQuestion: number;
};

/** Pregunta problemática (hotspot) */
export type HotspotItem = {
  questionId: string;
  title: string;
  errorRatePct: number;
  medianTimeSec?: number | null;
  commonWrongText?: string | null;
  attempts?: number;
};

/** Estudiante en riesgo */
export type RiskStudentItem = {
  studentId: string;
  name?: string | null;
  lastName?: string | null;
  lastExamScore10: number;
  attempts: number;
  lastAttemptAt?: string;
};

/** Calidad psicométrica de pregunta */
export type ItemQuality = {
  questionId: string;
  title: string;
  pCorrectPct: number;
  discrPointBiserial: number;
  medianTimeSec: number | null;
  attempts: number;
  claimRatePct: number;
  claimApprovalRatePct: number | null;
  avgRating: number | null;
};

/** Análisis de distractores por cuartiles */
export type DistractorBreakdown = {
  questionId: string;
  optionText: string;
  chosenPct: number;
  chosenPctLowQuartile?: number;
  chosenPctHighQuartile?: number;
};

/** Curvas de aprendizaje */
export type LearningCurves = {
  attemptsToMasteryP50: number | null;
  deltaPracticeToExamAvgPts: number;
};

/** Fiabilidad interna (KR-20) */
export type Reliability = { kr20: number | null };

/** Deriva temporal de dificultad */
export type DriftItem = {
  questionId: string;
  title?: string;
  deltaPCorrectPct: number;
  deltaMedianTimeSec: number | null;
};

/** Respuesta completa de estadísticas */
export type DiagramStatsResponse = {
  kpis: DiagramKpis;
  trends: TrendPoint[];
  histogramExam10: HistogramBucket[];
  scatterSpeedVsAccuracy: ScatterPoint[];
  hotspots: HotspotItem[];
  riskStudents: RiskStudentItem[];
  itemQuality?: ItemQuality[];
  distractors?: DistractorBreakdown[];
  learningCurves?: LearningCurves;
  reliability?: Reliability;
  drift?: DriftItem[];
};

type Range = { from?: string; to?: string };

/**
 * Calcula estadísticas completas de un diagrama
 * Incluye KPIs, análisis psicométrico, tendencias y alertas
 *
 * @param diagramId - ID del diagrama
 * @param range - Rango de fechas opcional
 * @returns Objeto con todas las métricas calculadas
 */
export async function getDiagramStatsService(
  diagramId: string,
  range?: Range
): Promise<DiagramStatsResponse> {
  // Filtro de fechas
  const whereSession: any = { diagram: { id: diagramId } };
  if (range?.from && range?.to) {
    whereSession.createdAt = Between(new Date(range.from), new Date(range.to));
  } else if (range?.from) {
    whereSession.createdAt = MoreThanOrEqual(new Date(range.from));
  }

  const sessionRepo = AppDataSource.getRepository(TestSession);

  const sessions = await sessionRepo.find({
    where: whereSession,
    relations: { user: true, diagram: true, results: { question: true } },
    order: { createdAt: "ASC" },
  });

  const examSessions = sessions.filter((s) => s.mode === "exam");
  const learningSessions = sessions.filter((s) => s.mode === "learning");

  const examResults = examSessions.flatMap((s) => s.results ?? []);
  const learningResults = learningSessions.flatMap((s) => s.results ?? []);
  const allResults = sessions.flatMap((s) => s.results ?? []);

  // === Cálculo de KPIs ===
  const examScoreAvg10 = examSessions.length
    ? avg(examSessions.map((s) => num(s.score)))
    : 0;

  const learningAccuracyPct = learningSessions.length
    ? avg(
        learningSessions.map((s) => ratioPct(s.correctCount, s.totalQuestions))
      )
    : 0;

  const masteryRatePct = examSessions.length
    ? (examSessions.filter((s) => num(s.score) >= 8).length * 100) /
      examSessions.length
    : 0;

  const atRiskRatePct = examSessions.length
    ? (examSessions.filter((s) => num(s.score) <= 5).length * 100) /
      examSessions.length
    : 0;

  const medianTimePerQuestionExamSec =
    median(examResults.map((r) => num(r.timeSpentSeconds))) ?? 0;

  const hintUsagePct = pctNum(
    learningResults.filter((r) => !!r.usedHint).length,
    Math.max(1, learningResults.length)
  );

  // Concentración de errores en top-5
  const byQuestion = groupBy(
    allResults.filter((r) => r.question?.id),
    (r) => r.question!.id
  );
  const errorAgg = Object.entries(byQuestion).map(([qid, rs]) => {
    const total = rs.length;
    const wrong = rs.filter((r) => r.isCorrect === false).length;
    return {
      questionId: qid,
      total,
      errors: wrong,
      errorRatePct: pctNum(wrong, Math.max(1, total)),
      medianTime: median(rs.map((r) => num(r.timeSpentSeconds))),
      commonWrongText: mostCommonWrong(rs),
      title:
        rs.find((r) => r.question?.prompt)?.question?.prompt ??
        `Pregunta ${qid}`,
    };
  });
  const top5 = [...errorAgg]
    .sort((a, b) => b.errorRatePct - a.errorRatePct)
    .slice(0, 5);
  const totalErrorsAll = errorAgg.reduce((s, r) => s + r.errors, 0);
  const errorConcentrationTop5Pct = totalErrorsAll
    ? pctNum(
        top5.reduce((s, r) => s + r.errors, 0),
        totalErrorsAll
      )
    : 0;

  const hotspots: HotspotItem[] = top5.map((h) => ({
    questionId: h.questionId,
    title: h.title,
    errorRatePct: round1(h.errorRatePct),
    medianTimeSec: h.medianTime ?? null,
    commonWrongText: h.commonWrongText,
    attempts: h.total,
  }));

  // Estudiantes en riesgo
  const examsByUser = groupBy(examSessions, (s) => s.user.id);
  const riskStudents: RiskStudentItem[] = Object.entries(examsByUser)
    .map(([userId, arr]) => {
      const ordered = [...arr].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
      const last = ordered[0];
      return {
        studentId: userId,
        name: last.user?.name ?? null,
        lastName: (last.user as any)?.lastName ?? null,
        lastExamScore10: num(last.score),
        attempts: arr.length,
        lastAttemptAt: last.createdAt.toISOString(),
      };
    })
    .filter((s) => s.lastExamScore10 <= 5)
    .sort((a, b) => a.lastExamScore10 - b.lastExamScore10);

  // Delta práctica→examen
  const learningByUser = groupBy(learningSessions, (s) => s.user.id);
  const deltasPerUser: number[] = [];
  for (const uid of Object.keys(examsByUser)) {
    const exArr = examsByUser[uid] || [];
    const leArr = learningByUser[uid] || [];
    if (!exArr.length || !leArr.length) continue;

    const examAvg = avg(exArr.map((s) => num(s.score)));
    const practiceAvg10 = avg(
      leArr.map((s) => {
        const acc = s.totalQuestions ? s.correctCount / s.totalQuestions : 0;
        return acc * 10;
      })
    );
    deltasPerUser.push(examAvg - practiceAvg10);
  }
  const deltaPracticeToExamAvgPts = deltasPerUser.length
    ? round2(avg(deltasPerUser))
    : 0;

  // Tendencias temporales
  const byDay = groupBy(sessions, (s) =>
    s.createdAt.toISOString().slice(0, 10)
  );
  const trends: TrendPoint[] = Object.entries(byDay)
    .map(([day, arr]) => {
      const exams = arr.filter((s) => s.mode === "exam");
      const learns = arr.filter((s) => s.mode === "learning");
      return {
        date: day,
        examScorePct: exams.length
          ? avg(exams.map((s) => num(s.score) * 10))
          : null,
        learningAccuracyPct: learns.length
          ? avg(learns.map((s) => ratioPct(s.correctCount, s.totalQuestions)))
          : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Histograma de notas
  const histogramExam10: HistogramBucket[] = Array.from(
    { length: 10 },
    (_, i) => ({ label: `${i}-${i + 1}`, count: 0 })
  );
  for (const s of examSessions) {
    const v = Math.max(0, Math.min(9, Math.floor(num(s.score))));
    histogramExam10[v].count += 1;
  }

  // Scatter precisión vs velocidad
  const learnAccByUser = Object.entries(
    groupBy(learningSessions, (s) => s.user.id)
  ).reduce<Record<string, number>>((acc, [uid, arr]) => {
    acc[uid] = arr.length
      ? avg(arr.map((s) => ratioPct(s.correctCount, s.totalQuestions)))
      : 0;
    return acc;
  }, {});

  const timePoolByUser: Record<string, number[]> = {};
  for (const s of examSessions) {
    const uid = s.user.id;
    const times = (s.results || [])
      .map((r) => num(r.timeSpentSeconds))
      .filter(isFiniteNum);
    if (!timePoolByUser[uid]) timePoolByUser[uid] = [];
    timePoolByUser[uid].push(...times);
  }
  const examTimeByUser: Record<string, number> = {};
  for (const [uid, arr] of Object.entries(timePoolByUser)) {
    examTimeByUser[uid] = median(arr) ?? 0;
  }
  const userNames: Record<string, string | null> = {};
  for (const s of sessions) userNames[s.user.id] = s.user.name ?? null;

  const scatterSpeedVsAccuracy: ScatterPoint[] = Object.keys({
    ...learnAccByUser,
    ...examTimeByUser,
  }).map((uid) => ({
    studentId: uid,
    name: userNames[uid] ?? null,
    accuracyPct: learnAccByUser[uid] ?? 0,
    timeSecPerQuestion: examTimeByUser[uid] ?? 0,
  }));

  // Calidad de ítems (discriminación point-biserial)
  type DiscRow = {
    correct01: number;
    totalExcl: number;
    timeSec: number | null;
    title: string;
  };
  const discData = new Map<string, DiscRow[]>();
  for (const s of examSessions) {
    const results = (s.results || []).filter((r) => r.question?.id);
    const total = results.reduce((sum, r) => sum + (r.isCorrect ? 1 : 0), 0);
    for (const r of results) {
      const qid = r.question!.id!;
      const arr = discData.get(qid) || [];
      arr.push({
        correct01: r.isCorrect ? 1 : 0,
        totalExcl: total - (r.isCorrect ? 1 : 0),
        timeSec: isFiniteNum(r.timeSpentSeconds) ? r.timeSpentSeconds! : null,
        title: r.question?.prompt ?? `Pregunta ${qid}`,
      });
      discData.set(qid, arr);
    }
  }

  const attemptsByQ: Record<string, number> = {};
  const correctByQ: Record<string, number> = {};
  const titleByQ: Record<string, string> = {};
  const medianTimeByQ: Record<string, number | null> = {};
  for (const [qid, rs] of Object.entries(byQuestion)) {
    attemptsByQ[qid] = rs.length;
    correctByQ[qid] = rs.filter((r) => r.isCorrect === true).length;
    titleByQ[qid] =
      rs.find((r) => r.question?.prompt)?.question?.prompt ?? `Pregunta ${qid}`;
    medianTimeByQ[qid] = median(rs.map((r) => num(r.timeSpentSeconds)));
  }

  // Reclamaciones
  const claimQB = AppDataSource.getRepository(Claim)
    .createQueryBuilder("c")
    .leftJoin("c.question", "q")
    .leftJoin("q.diagram", "d")
    .where("d.id = :diagramId", { diagramId });

  if (range?.from && range?.to) {
    claimQB.andWhere("c.createdAt BETWEEN :from AND :to", {
      from: new Date(range.from),
      to: new Date(range.to),
    });
  } else if (range?.from) {
    claimQB.andWhere("c.createdAt >= :from", { from: new Date(range.from) });
  }

  const claimRows = await claimQB
    .select([
      "q.id AS qid",
      "SUM(CASE WHEN c.status = :approved THEN 1 ELSE 0 END) AS approved",
      "COUNT(*) AS total",
    ])
    .setParameters({ approved: ClaimStatus.APPROVED })
    .groupBy("q.id")
    .getRawMany<{
      qid: string;
      approved: string | number;
      total: string | number;
    }>();

  const claimsTotalByQ: Record<string, number> = {};
  const claimsApprovedByQ: Record<string, number> = {};
  for (const row of claimRows) {
    const qid = String(row.qid);
    claimsTotalByQ[qid] = Number(row.total || 0);
    claimsApprovedByQ[qid] = Number(row.approved || 0);
  }

  // Ratings
  const ratingRows = await AppDataSource.getRepository(Rating)
    .createQueryBuilder("r")
    .leftJoin("r.question", "q")
    .leftJoin("q.diagram", "d")
    .where("d.id = :diagramId", { diagramId })
    .select(["q.id AS qid", "AVG(r.rating) AS avgRating"])
    .groupBy("q.id")
    .getRawMany<{ qid: string; avgRating: string | number }>();
  const ratingByQ: Record<string, number> = {};
  for (const row of ratingRows)
    ratingByQ[String(row.qid)] = Number(row.avgRating || 0);

  const itemQuality: ItemQuality[] = Object.keys({
    ...attemptsByQ,
    ...discData,
  })
    .map((qid) => {
      const attempts = attemptsByQ[qid] ?? 0;
      const correct = correctByQ[qid] ?? 0;
      const pCorrectPct = pctNum(correct, Math.max(1, attempts));
      const discRows = discData.get(qid) || [];
      const rpb = pointBiserial(
        discRows.map((d) => d.correct01),
        discRows.map((d) => d.totalExcl)
      );
      const medianTimeSec = medianTimeByQ[qid] ?? null;
      const claimsTotal = claimsTotalByQ[qid] ?? 0;
      const claimsApproved = claimsApprovedByQ[qid] ?? 0;
      const claimRatePct = pctNum(claimsTotal, Math.max(1, attempts));
      const claimApprovalRatePct = claimsTotal
        ? pctNum(claimsApproved, claimsTotal)
        : null;
      const avgRating = ratingByQ[qid] ?? null;
      return {
        questionId: qid,
        title: titleByQ[qid] ?? `Pregunta ${qid}`,
        pCorrectPct: round1(pCorrectPct),
        discrPointBiserial: round2(rpb ?? 0),
        medianTimeSec: medianTimeSec != null ? round2(medianTimeSec) : null,
        attempts,
        claimRatePct: round1(claimRatePct),
        claimApprovalRatePct:
          claimApprovalRatePct != null ? round1(claimApprovalRatePct) : null,
        avgRating: avgRating != null ? round2(avgRating) : null,
      };
    })
    .sort((a, b) => a.pCorrectPct - b.pCorrectPct);

  // Análisis de distractores por cuartiles
  const distractors: DistractorBreakdown[] = [];
  const resultUser: Record<string, string> = {};
  for (const s of sessions) {
    for (const r of s.results || []) {
      if (r?.id) resultUser[r.id] = s.user.id;
    }
  }
  const userExamScores = Object.entries(
    groupBy(examSessions, (s) => s.user.id)
  ).reduce<Record<string, number>>((acc, [uid, arr]) => {
    acc[uid] = arr.length ? avg(arr.map((s) => num(s.score))) : 0;
    return acc;
  }, {});
  const scoreValues = Object.values(userExamScores)
    .filter(isFiniteNum)
    .sort((a, b) => a - b);
  const q25 = scoreValues.length ? quantile(scoreValues, 0.25) : 0;
  const q75 = scoreValues.length ? quantile(scoreValues, 0.75) : 0;

  for (const [qid, rs] of Object.entries(byQuestion)) {
    const sel = rs.filter(
      (r) => r.selectedIndex != null && Array.isArray(r.optionsSnapshot)
    );
    const totalSel = sel.length || 1;
    const mapGlobal = new Map<string, number>();
    const mapLow = new Map<string, number>();
    const mapHigh = new Map<string, number>();

    for (const r of sel) {
      const txt = r.optionsSnapshot![r.selectedIndex!];
      if (!txt) continue;
      mapGlobal.set(txt, (mapGlobal.get(txt) ?? 0) + 1);

      const uid = resultUser[r.id];
      const sc = uid ? userExamScores[uid] : undefined;
      if (sc != null) {
        if (sc <= q25) mapLow.set(txt, (mapLow.get(txt) ?? 0) + 1);
        if (sc >= q75) mapHigh.set(txt, (mapHigh.get(txt) ?? 0) + 1);
      }
    }

    for (const [txt, n] of mapGlobal) {
      distractors.push({
        questionId: qid,
        optionText: txt,
        chosenPct: round1(pctNum(n, totalSel)),
        chosenPctLowQuartile: mapLow.has(txt)
          ? round1(pctNum(mapLow.get(txt)!, Math.max(1, sumMap(mapLow))))
          : undefined,
        chosenPctHighQuartile: mapHigh.has(txt)
          ? round1(pctNum(mapHigh.get(txt)!, Math.max(1, sumMap(mapHigh))))
          : undefined,
      });
    }
  }

  // Curvas de aprendizaje
  const attemptsUntilMastery: number[] = [];
  for (const [uid, arr] of Object.entries(examsByUser)) {
    const ordered = arr.sort(
      (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
    );
    let count = 0;
    let reached = false;
    for (const s of ordered) {
      count += 1;
      if (num(s.score) >= 8) {
        reached = true;
        break;
      }
    }
    if (reached) attemptsUntilMastery.push(count);
  }
  const attemptsToMasteryP50 = attemptsUntilMastery.length
    ? Math.round(quantile(attemptsUntilMastery, 0.5))
    : null;

  const learningCurves: LearningCurves = {
    attemptsToMasteryP50,
    deltaPracticeToExamAvgPts,
  };

  // Fiabilidad (KR-20)
  const kCounts = countBy(
    examSessions.map((s) => s.totalQuestions || (s.results?.length ?? 0))
  );
  const modalK = Number(
    Object.entries(kCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0
  );
  let kr20: number | null = null;
  if (modalK > 1) {
    const exByQ = groupBy(
      examResults.filter((r) => r.question?.id),
      (r) => r.question!.id
    );
    const piByQ: Record<string, number> = {};
    for (const [qid, rs] of Object.entries(exByQ)) {
      const attempts = rs.length;
      const correct = rs.filter((r) => r.isCorrect === true).length;
      piByQ[qid] = attempts ? correct / attempts : 0;
    }
    const topQids = Object.keys(exByQ)
      .sort((a, b) => exByQ[b].length - exByQ[a].length)
      .slice(0, modalK);

    const sum_pq = topQids.reduce((s, qid) => {
      const p = piByQ[qid] ?? 0;
      const q = 1 - p;
      return s + p * q;
    }, 0);

    const totalScores = examSessions
      .map((s) => {
        const rs = (s.results || []).filter(
          (r) => r.question?.id && topQids.includes(r.question!.id)
        );
        return rs.reduce((sum, r) => sum + (r.isCorrect ? 1 : 0), 0);
      })
      .filter(isFiniteNum);

    const varTotal = variance(totalScores);
    if (varTotal > 0) {
      kr20 = (modalK / (modalK - 1)) * (1 - sum_pq / varTotal);
      if (!isFiniteNum(kr20)) kr20 = null;
      else kr20 = Math.max(0, Math.min(1, kr20));
    }
  }

  // Drift temporal (mitad 1 vs mitad 2)
  const midIndex = Math.floor(sessions.length / 2);
  const firstHalf = sessions.slice(0, midIndex);
  const secondHalf = sessions.slice(midIndex);

  const byQFirst = groupBy(
    firstHalf.flatMap((s) => s.results || []).filter((r) => r.question?.id),
    (r) => r.question!.id
  );
  const byQSecond = groupBy(
    secondHalf.flatMap((s) => s.results || []).filter((r) => r.question?.id),
    (r) => r.question!.id
  );

  const drift: DriftItem[] = Object.keys({ ...byQFirst, ...byQSecond })
    .map((qid) => {
      const r1 = byQFirst[qid] || [];
      const r2 = byQSecond[qid] || [];
      const p1 = r1.length
        ? pctNum(r1.filter((r) => r.isCorrect === true).length, r1.length)
        : 0;
      const p2 = r2.length
        ? pctNum(r2.filter((r) => r.isCorrect === true).length, r2.length)
        : 0;
      const t1 = median(r1.map((r) => num(r.timeSpentSeconds)));
      const t2 = median(r2.map((r) => num(r.timeSpentSeconds)));
      return {
        questionId: qid,
        title:
          (r1[0]?.question?.prompt || r2[0]?.question?.prompt) ??
          `Pregunta ${qid}`,
        deltaPCorrectPct: round1(p2 - p1),
        deltaMedianTimeSec:
          t1 != null && t2 != null ? round2(t2 - t1) : t2 ?? t1 ?? null,
      };
    })
    .sort(
      (a, b) => Math.abs(b.deltaPCorrectPct) - Math.abs(a.deltaPCorrectPct)
    );

  return {
    kpis: {
      examScoreAvg10: round2(examScoreAvg10),
      learningAccuracyPct: round1(learningAccuracyPct),
      masteryRatePct: round1(masteryRatePct),
      atRiskRatePct: round1(atRiskRatePct),
      practiceToExamDeltaPts: deltaPracticeToExamAvgPts,
      medianTimePerQuestionExamSec: round2(medianTimePerQuestionExamSec),
      hintUsagePct: round1(hintUsagePct),
      errorConcentrationTop5Pct: round1(errorConcentrationTop5Pct),
    },
    trends,
    histogramExam10,
    scatterSpeedVsAccuracy,
    hotspots,
    riskStudents,
    itemQuality,
    distractors,
    learningCurves,
    reliability: { kr20 },
    drift,
  };
}

/* ========= Funciones auxiliares ========= */
function num(n: any): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}
function isFiniteNum(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
function avg(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}
function variance(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = avg(arr);
  return arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1);
}
function median(arr: (number | null | undefined)[]): number | null {
  const a = arr.filter(isFiniteNum).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function quantile(arr: number[], q: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return a[base + 1] !== undefined
    ? a[base] + rest * (a[base + 1] - a[base])
    : a[base];
}
function pctNum(part: number, total: number): number {
  return Math.round((total ? (part * 100) / total : 0) * 10) / 10;
}
function ratioPct(part: number, total: number): number {
  return total ? (part * 100) / total : 0;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function sumMap(m: Map<string, number>): number {
  let s = 0;
  for (const v of m.values()) s += v;
  return s;
}
function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (t: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, cur) => {
    const k = keyFn(cur);
    (acc[k] ||= []).push(cur);
    return acc;
  }, {} as Record<K, T[]>);
}
function countBy(arr: Array<string | number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) {
    const k = String(v);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
function pointBiserial(y01: number[], x: number[]): number | null {
  const n = Math.min(y01.length, x.length);
  if (n === 0) return null;
  const xArr = x.slice(0, n);
  const yArr = y01.slice(0, n);

  const xMean = avg(xArr);
  const xSd = Math.sqrt(variance(xArr));
  if (xSd === 0) return null;

  const y1 = xArr.filter((_, i) => yArr[i] === 1);
  const y0 = xArr.filter((_, i) => yArr[i] === 0);
  if (!y1.length || !y0.length) return 0;

  const m1 = avg(y1);
  const m0 = avg(y0);
  const p = yArr.filter((v) => v === 1).length / n;
  const q = 1 - p;

  return ((m1 - m0) / xSd) * Math.sqrt(p * q);
}
function mostCommonWrong(rs: TestResult[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rs) {
    if (
      r.isCorrect === false &&
      r.selectedIndex != null &&
      Array.isArray(r.optionsSnapshot)
    ) {
      const txt = r.optionsSnapshot[r.selectedIndex];
      if (!txt) continue;
      counts.set(txt, (counts.get(txt) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of counts) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}
