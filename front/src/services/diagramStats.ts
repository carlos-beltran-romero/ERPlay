import { apiJson } from './http';

/**
 * ===============================
 *  Tipos base ya existentes
 * ===============================
 */
export type DiagramKpis = {
  examScoreAvg10: number;              // 0..10
  learningAccuracyPct: number;         // 0..100
  masteryRatePct: number;              // >=8/10
  atRiskRatePct: number;               // <=5/10
  practiceToExamDeltaPts: number;      // puntos (0..10 vs 0..10 => dif en pts)
  medianTimePerQuestionExamSec: number;
  hintUsagePct: number;
  errorConcentrationTop5Pct?: number;  // opcional
};

export type TrendPoint = {
  date: string;                        // YYYY-MM-DD
  examScorePct?: number | null;        // 0..100
  learningAccuracyPct?: number | null; // 0..100
};

export type HistogramBucket = { label: string; count: number }; // p.e. "0-1", "1-2", ..., "9-10"

export type ScatterPoint = {
  studentId?: string;
  name?: string | null;
  accuracyPct: number;                 // 0..100 (learning o global)
  timeSecPerQuestion: number;          // mediana por alumno (examen)
};

export type HotspotItem = {
  questionId: string;
  title: string;
  errorRatePct: number;                // 0..100
  medianTimeSec?: number | null;
  commonWrongText?: string | null;
  attempts?: number;
};

export type RiskStudentItem = {
  studentId: string;
  name?: string | null;
  lastName?: string | null;            // 👈 añadido
  lastExamScore10: number;
  attempts: number;
  lastAttemptAt?: string;              // ISO
};

/**
 * ===============================
 *  Nuevos tipos (compatibles)
 * ===============================
 * - Pensados para comprensión de un profesor de programación:
 *   Dificultad = % acierto (más alto = más fácil)
 *   Discriminación = qué bien separa a quien domina del que no (-1..1)
 *   KR-20 = fiabilidad del test (0..1)
 */
export type ItemQuality = {
  questionId: string;
  title: string;
  pCorrectPct: number;                 // 0..100 (dificultad)
  discrPointBiserial: number;          // -1..1
  medianTimeSec: number | null;
  attempts: number;
  claimRatePct: number;                // % de intentos con reclamación
  claimApprovalRatePct: number | null; // % de reclamaciones aprobadas
  avgRating: number | null;            // 1..5
};

export type DistractorBreakdown = {
  questionId: string;
  optionText: string;                  // texto de la opción
  chosenPct: number;                   // 0..100 (popularidad global)
  chosenPctLowQuartile?: number;       // 0..100 (alumnos con peores notas)
  chosenPctHighQuartile?: number;      // 0..100 (alumnos con mejores notas)
};

export type LearningCurves = {
  attemptsToMasteryP50: number | null; // mediana de intentos hasta ≥ 8/10
  deltaPracticeToExamAvgPts: number;   // media (examen - práctica) en puntos sobre 10
};

export type Reliability = { kr20: number | null }; // 0..1

export type DriftItem = {
  questionId: string;
  title?: string;
  deltaPCorrectPct: number;            // cambio de % acierto (mitad2 - mitad1)
  deltaMedianTimeSec: number | null;   // cambio de tiempo mediano
};

/**
 * Respuesta principal del endpoint de estadísticas.
 * Los nuevos bloques son opcionales para mantener compatibilidad.
 */
export type DiagramStatsResponse = {
  kpis: DiagramKpis;
  trends: TrendPoint[];                  // últimos 30 días por defecto (o rango)
  histogramExam10: HistogramBucket[];
  scatterSpeedVsAccuracy: ScatterPoint[];
  hotspots: HotspotItem[];
  riskStudents: RiskStudentItem[];

  // ====== NUEVOS (opcionales) ======
  itemQuality?: ItemQuality[];
  distractors?: DistractorBreakdown[];
  learningCurves?: LearningCurves;
  reliability?: Reliability;
  drift?: DriftItem[];
};

/**
 * Carga las estadísticas del diagrama con normalización defensiva.
 * Si el backend todavía no envía algún bloque nuevo, el campo vendrá undefined.
 */
export async function getDiagramStats(diagramId: string, params?: {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}): Promise<DiagramStatsResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);

  const url = `/api/admin/diagrams/${diagramId}/stats${qs.toString() ? `?${qs.toString()}` : ''}`;
  const data = await apiJson<any>(url, {
    auth: true,
    fallbackError: 'No se pudieron cargar las estadísticas',
  });

  // ----- KPIs (obligatorios) -----
  const kpis: DiagramKpis = {
    examScoreAvg10: Number(data?.kpis?.examScoreAvg10 ?? 0),
    learningAccuracyPct: Number(data?.kpis?.learningAccuracyPct ?? 0),
    masteryRatePct: Number(data?.kpis?.masteryRatePct ?? 0),
    atRiskRatePct: Number(data?.kpis?.atRiskRatePct ?? 0),
    practiceToExamDeltaPts: Number(data?.kpis?.practiceToExamDeltaPts ?? 0),
    medianTimePerQuestionExamSec: Number(data?.kpis?.medianTimePerQuestionExamSec ?? 0),
    hintUsagePct: Number(data?.kpis?.hintUsagePct ?? 0),
    errorConcentrationTop5Pct: data?.kpis?.errorConcentrationTop5Pct != null
      ? Number(data.kpis.errorConcentrationTop5Pct) : undefined,
  };

  // ----- Series / gráficas base -----
  const trends: TrendPoint[] = Array.isArray(data?.trends) ? data.trends.map((t: any) => ({
    date: String(t.date ?? ''),
    examScorePct: t.examScorePct != null ? Number(t.examScorePct) : null,
    learningAccuracyPct: t.learningAccuracyPct != null ? Number(t.learningAccuracyPct) : null,
  })) : [];

  const histogramExam10: HistogramBucket[] = Array.isArray(data?.histogramExam10) ? data.histogramExam10.map((b: any) => ({
    label: String(b.label ?? ''),
    count: Number(b.count ?? 0),
  })) : [];

  const scatterSpeedVsAccuracy: ScatterPoint[] = Array.isArray(data?.scatterSpeedVsAccuracy)
    ? data.scatterSpeedVsAccuracy.map((p: any) => ({
        studentId: p.studentId ? String(p.studentId) : undefined,
        name: p.name ?? null,
        accuracyPct: Number(p.accuracyPct ?? 0),
        timeSecPerQuestion: Number(p.timeSecPerQuestion ?? 0),
      }))
    : [];

  const hotspots: HotspotItem[] = Array.isArray(data?.hotspots) ? data.hotspots.map((h: any) => ({
    questionId: String(h.questionId ?? ''),
    title: String(h.title ?? 'Pregunta'),
    errorRatePct: Number(h.errorRatePct ?? 0),
    medianTimeSec: h.medianTimeSec != null ? Number(h.medianTimeSec) : null,
    commonWrongText: h.commonWrongText ?? null,
    attempts: Number(h.attempts ?? 0),
  })) : [];

  const riskStudents: RiskStudentItem[] = Array.isArray(data?.riskStudents)
    ? data.riskStudents.map((r: any) => ({
        studentId: String(r.studentId ?? ''),
        name: r.name ?? null,
        lastName: r.lastName ?? null, // 👈 recogemos apellidos si vienen
        lastExamScore10: Number(r.lastExamScore10 ?? 0),
        attempts: Number(r.attempts ?? 0),
        lastAttemptAt: r.lastAttemptAt ?? undefined,
      }))
    : [];

  // ----- NUEVOS BLOQUES (opcionales) -----
  const itemQuality: ItemQuality[] | undefined = Array.isArray(data?.itemQuality)
    ? data.itemQuality.map((q: any) => ({
        questionId: String(q?.questionId ?? ''),
        title: String(q?.title ?? 'Pregunta'),
        pCorrectPct: Number(q?.pCorrectPct ?? 0),
        discrPointBiserial: Number(q?.discrPointBiserial ?? 0),
        medianTimeSec: q?.medianTimeSec != null ? Number(q.medianTimeSec) : null,
        attempts: Number(q?.attempts ?? 0),
        claimRatePct: Number(q?.claimRatePct ?? 0),
        claimApprovalRatePct: q?.claimApprovalRatePct != null ? Number(q.claimApprovalRatePct) : null,
        avgRating: q?.avgRating != null ? Number(q.avgRating) : null,
      }))
    : undefined;

  const distractors: DistractorBreakdown[] | undefined = Array.isArray(data?.distractors)
    ? data.distractors.map((d: any) => ({
        questionId: String(d?.questionId ?? ''),
        optionText: String(d?.optionText ?? ''),
        chosenPct: Number(d?.chosenPct ?? 0),
        chosenPctLowQuartile: d?.chosenPctLowQuartile != null ? Number(d.chosenPctLowQuartile) : undefined,
        chosenPctHighQuartile: d?.chosenPctHighQuartile != null ? Number(d.chosenPctHighQuartile) : undefined,
      }))
    : undefined;

  const learningCurves: LearningCurves | undefined = data?.learningCurves
    ? {
        attemptsToMasteryP50: data.learningCurves.attemptsToMasteryP50 != null
          ? Number(data.learningCurves.attemptsToMasteryP50)
          : null,
        deltaPracticeToExamAvgPts: Number(data.learningCurves.deltaPracticeToExamAvgPts ?? 0),
      }
    : undefined;

  const reliability: Reliability | undefined = data?.reliability
    ? { kr20: data.reliability.kr20 != null ? Number(data.reliability.kr20) : null }
    : undefined;

  const drift: DriftItem[] | undefined = Array.isArray(data?.drift)
    ? data.drift.map((d: any) => ({
        questionId: String(d?.questionId ?? ''),
        title: d?.title != null ? String(d.title) : undefined,
        deltaPCorrectPct: Number(d?.deltaPCorrectPct ?? 0),
        deltaMedianTimeSec: d?.deltaMedianTimeSec != null ? Number(d.deltaMedianTimeSec) : null,
      }))
    : undefined;

  // Ensamblado final (compatibilidad mantenida)
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
