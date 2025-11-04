/**
 * Módulo de servicios de estadísticas de diagramas
 * Proporciona métricas pedagógicas y psicométricas para análisis de tests
 * @module services/diagramStats
 */

import { apiJson } from "./http";

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

/** Punto de serie temporal para gráficas de tendencia */
export type TrendPoint = {
  date: string;
  examScorePct?: number | null;
  learningAccuracyPct?: number | null;
};

/** Bucket de histograma de notas (ej: "8-9", "9-10") */
export type HistogramBucket = { label: string; count: number };

/** Punto de scatter plot velocidad vs precisión */
export type ScatterPoint = {
  studentId?: string;
  name?: string | null;
  accuracyPct: number;
  timeSecPerQuestion: number;
};

/** Pregunta problemática (alto % de error) */
export type HotspotItem = {
  questionId: string;
  title: string;
  errorRatePct: number;
  medianTimeSec?: number | null;
  commonWrongText?: string | null;
  attempts?: number;
};

/** Estudiante en riesgo (nota baja en último examen) */
export type RiskStudentItem = {
  studentId: string;
  name?: string | null;
  lastName?: string | null;
  lastExamScore10: number;
  attempts: number;
  lastAttemptAt?: string;
};

/** Calidad psicométrica de pregunta (TCT) */
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

/** Análisis de distractores por pregunta */
export type DistractorBreakdown = {
  questionId: string;
  optionText: string;
  chosenPct: number;
  chosenPctLowQuartile?: number;
  chosenPctHighQuartile?: number;
};

/** Métricas de curvas de aprendizaje */
export type LearningCurves = {
  attemptsToMasteryP50: number | null;
  deltaPracticeToExamAvgPts: number;
};

/** Fiabilidad del test (Kuder-Richardson 20) */
export type Reliability = { kr20: number | null };

/** Drift temporal de dificultad de pregunta */
export type DriftItem = {
  questionId: string;
  title?: string;
  deltaPCorrectPct: number;
  deltaMedianTimeSec: number | null;
};

/** Respuesta completa del endpoint de estadísticas */
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

/**
 * Obtiene estadísticas avanzadas de un diagrama
 * Calcula métricas pedagógicas y psicométricas para análisis docente
 *
 * @param diagramId - ID del diagrama a analizar
 * @param params - Rango de fechas opcional para filtrar datos
 * @returns Estadísticas completas con KPIs, gráficas y análisis
 * @throws {Error} 404 si el diagrama no existe
 * @remarks
 * - KPIs obligatorios: siempre presentes
 * - Bloques avanzados (itemQuality, distractors, etc.): opcionales (backend debe soportarlos)
 * - pCorrectPct: % de acierto (0-100, mayor = más fácil)
 * - discrPointBiserial: Discriminación (-1..1, positivo = buena pregunta)
 * - kr20: Fiabilidad (0..1, >0.7 = aceptable)
 * - from/to: Filtro temporal (YYYY-MM-DD), default = últimos 30 días
 */
export async function getDiagramStats(
  diagramId: string,
  params?: {
    from?: string;
    to?: string;
  }
): Promise<DiagramStatsResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);

  const url = `/api/admin/diagrams/${diagramId}/stats${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;
  const data = await apiJson<any>(url, {
    auth: true,
    fallbackError: "No se pudieron cargar las estadísticas",
  });

  const kpis: DiagramKpis = {
    examScoreAvg10: Number(data?.kpis?.examScoreAvg10 ?? 0),
    learningAccuracyPct: Number(data?.kpis?.learningAccuracyPct ?? 0),
    masteryRatePct: Number(data?.kpis?.masteryRatePct ?? 0),
    atRiskRatePct: Number(data?.kpis?.atRiskRatePct ?? 0),
    practiceToExamDeltaPts: Number(data?.kpis?.practiceToExamDeltaPts ?? 0),
    medianTimePerQuestionExamSec: Number(
      data?.kpis?.medianTimePerQuestionExamSec ?? 0
    ),
    hintUsagePct: Number(data?.kpis?.hintUsagePct ?? 0),
    errorConcentrationTop5Pct:
      data?.kpis?.errorConcentrationTop5Pct != null
        ? Number(data.kpis.errorConcentrationTop5Pct)
        : undefined,
  };

  const trends: TrendPoint[] = Array.isArray(data?.trends)
    ? data.trends.map((t: any) => ({
        date: String(t.date ?? ""),
        examScorePct: t.examScorePct != null ? Number(t.examScorePct) : null,
        learningAccuracyPct:
          t.learningAccuracyPct != null ? Number(t.learningAccuracyPct) : null,
      }))
    : [];

  const histogramExam10: HistogramBucket[] = Array.isArray(
    data?.histogramExam10
  )
    ? data.histogramExam10.map((b: any) => ({
        label: String(b.label ?? ""),
        count: Number(b.count ?? 0),
      }))
    : [];

  const scatterSpeedVsAccuracy: ScatterPoint[] = Array.isArray(
    data?.scatterSpeedVsAccuracy
  )
    ? data.scatterSpeedVsAccuracy.map((p: any) => ({
        studentId: p.studentId ? String(p.studentId) : undefined,
        name: p.name ?? null,
        accuracyPct: Number(p.accuracyPct ?? 0),
        timeSecPerQuestion: Number(p.timeSecPerQuestion ?? 0),
      }))
    : [];

  const hotspots: HotspotItem[] = Array.isArray(data?.hotspots)
    ? data.hotspots.map((h: any) => ({
        questionId: String(h.questionId ?? ""),
        title: String(h.title ?? "Pregunta"),
        errorRatePct: Number(h.errorRatePct ?? 0),
        medianTimeSec: h.medianTimeSec != null ? Number(h.medianTimeSec) : null,
        commonWrongText: h.commonWrongText ?? null,
        attempts: Number(h.attempts ?? 0),
      }))
    : [];

  const riskStudents: RiskStudentItem[] = Array.isArray(data?.riskStudents)
    ? data.riskStudents.map((r: any) => ({
        studentId: String(r.studentId ?? ""),
        name: r.name ?? null,
        lastName: r.lastName ?? null,
        lastExamScore10: Number(r.lastExamScore10 ?? 0),
        attempts: Number(r.attempts ?? 0),
        lastAttemptAt: r.lastAttemptAt ?? undefined,
      }))
    : [];

  const itemQuality: ItemQuality[] | undefined = Array.isArray(
    data?.itemQuality
  )
    ? data.itemQuality.map((q: any) => ({
        questionId: String(q?.questionId ?? ""),
        title: String(q?.title ?? "Pregunta"),
        pCorrectPct: Number(q?.pCorrectPct ?? 0),
        discrPointBiserial: Number(q?.discrPointBiserial ?? 0),
        medianTimeSec:
          q?.medianTimeSec != null ? Number(q.medianTimeSec) : null,
        attempts: Number(q?.attempts ?? 0),
        claimRatePct: Number(q?.claimRatePct ?? 0),
        claimApprovalRatePct:
          q?.claimApprovalRatePct != null
            ? Number(q.claimApprovalRatePct)
            : null,
        avgRating: q?.avgRating != null ? Number(q.avgRating) : null,
      }))
    : undefined;

  const distractors: DistractorBreakdown[] | undefined = Array.isArray(
    data?.distractors
  )
    ? data.distractors.map((d: any) => ({
        questionId: String(d?.questionId ?? ""),
        optionText: String(d?.optionText ?? ""),
        chosenPct: Number(d?.chosenPct ?? 0),
        chosenPctLowQuartile:
          d?.chosenPctLowQuartile != null
            ? Number(d.chosenPctLowQuartile)
            : undefined,
        chosenPctHighQuartile:
          d?.chosenPctHighQuartile != null
            ? Number(d.chosenPctHighQuartile)
            : undefined,
      }))
    : undefined;

  const learningCurves: LearningCurves | undefined = data?.learningCurves
    ? {
        attemptsToMasteryP50:
          data.learningCurves.attemptsToMasteryP50 != null
            ? Number(data.learningCurves.attemptsToMasteryP50)
            : null,
        deltaPracticeToExamAvgPts: Number(
          data.learningCurves.deltaPracticeToExamAvgPts ?? 0
        ),
      }
    : undefined;

  const reliability: Reliability | undefined = data?.reliability
    ? {
        kr20:
          data.reliability.kr20 != null ? Number(data.reliability.kr20) : null,
      }
    : undefined;

  const drift: DriftItem[] | undefined = Array.isArray(data?.drift)
    ? data.drift.map((d: any) => ({
        questionId: String(d?.questionId ?? ""),
        title: d?.title != null ? String(d.title) : undefined,
        deltaPCorrectPct: Number(d?.deltaPCorrectPct ?? 0),
        deltaMedianTimeSec:
          d?.deltaMedianTimeSec != null ? Number(d.deltaMedianTimeSec) : null,
      }))
    : undefined;

  return {
    kpis,
    trends,
    histogramExam10,
    scatterSpeedVsAccuracy,
    hotspots,
    riskStudents,
    itemQuality,
    distractors,
    learningCurves,
    reliability,
    drift,
  };
}
