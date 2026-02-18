/**
 * Módulo de servicios de supervisor
 * Gestiona operaciones administrativas sobre estudiantes, objetivos y análisis
 * @module front/services/supervisor
 */

import { fetchAuth } from "./http";
import { resolveAssetUrl } from "../shared/utils/url";

/**
 * Helper para peticiones JSON con manejo de errores
 * @internal
 */
async function getJSON(url: string) {
  const res = await fetchAuth(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Error de servidor");
  return data;
}

/**
 * Resuelve path de imagen a URL absoluta (consistente con el resto de la app)
 * - Si `p` ya es URL absoluta -> se respeta, PERO corrige el caso dev típico:
 *      http://localhost/uploads/... (sin puerto) -> usa origin real del front (resolveAssetUrl)
 * - Si `p` es relativa -> se resuelve con resolveAssetUrl
 * - Fallback: devuelve p si existe
 * @internal
 */
const toAbs = (p?: string | null) => {
  if (!p) return null;

  // Relativa -> resuelve con el origin real (incluye :8080 si aplica)
  if (!/^https?:\/\//i.test(p)) return resolveAssetUrl(p) || p;

  // Absoluta -> parsea para poder corregir "localhost" sin puerto
  try {
    const u = new URL(p);

    // Caso típico en dev: backend devuelve http://localhost/... sin :8080
    // (o equivalente con 127.0.0.1) => rehacer con el origin del front
    const isLocalhost =
      u.hostname === "localhost" || u.hostname === "127.0.0.1";

    const noPortOrPort80 = !u.port || u.port === "80";

    if (isLocalhost && noPortOrPort80) {
      // Conserva pathname + query
      return resolveAssetUrl(u.pathname + u.search) || p;
    }

    // En otros casos, respetamos la URL absoluta tal cual
    return p;
  } catch {
    // Si es una URL absoluta rara o inválida, no rompemos
    return p;
  }
};

/* ===================== Tipos ===================== */

export type SupStudent = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
};

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
  pct: number;
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
  examScoreAvg: number;
  accuracyLearningPct: number;
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
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "pending"
    | "approved"
    | "rejected";
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  reviewedAt?: string | null;
  options?: string[];
  correctIndex?: number;
  reviewComment?: string | null;
};

export type SupSessionSummary = {
  id: string;
  mode: "learning" | "exam" | "errors";
  startedAt: string;
  finishedAt?: string | null;
  diagram?: { id: string; title: string; path?: string | null } | null;
  summary?: {
    durationSeconds?: number | null;
    accuracyPct?: number | null;
    score?: number | null;
    noteLabel?: string | null;
  };
  questionCount?: number;
};

export type SupClaimItem = {
  id: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "pending"
    | "approved"
    | "rejected";
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
  return await getJSON(`/api/supervisor/students/${studentId}`);
}

/* ===================== Progress ===================== */

export async function supGetOverview(studentId: string) {
  return await getJSON(
    `/api/supervisor/students/${studentId}/progress/overview`
  );
}

export async function supGetTrends(
  studentId: string,
  { bucket = "day" as "day" | "week" | "month" } = {}
) {
  const q = new URLSearchParams({ bucket }).toString();
  return await getJSON(
    `/api/supervisor/students/${studentId}/progress/trends?${q}`
  );
}

export async function supGetErrors(studentId: string, limit = 5) {
  return await getJSON(
    `/api/supervisor/students/${studentId}/progress/errors?limit=${limit}`
  );
}

export async function supGetClaimsStats(studentId: string) {
  return await getJSON(`/api/supervisor/students/${studentId}/claims/stats`);
}

/* ===================== Preguntas creadas por un usuario ===================== */

export async function supGetCreatedQuestions(
  userId: string,
  opts: { limit?: number } = {}
) {
  const res = await fetchAuth(
    `/api/supervisor/students/${userId}/questions?limit=${opts.limit ?? 200}`
  );
  const data = await res.json().catch(() => []);
  if (!res.ok)
    throw new Error(
      (data as any)?.error || "No se pudieron cargar las preguntas del alumno"
    );

  const rows = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
    ? data
    : [];

  return rows.map((q: any) => {
    const status =
      (q.status ??
        q.reviewStatus ??
        q.state ??
        (typeof q.verified === "boolean"
          ? q.verified
            ? "APPROVED"
            : "PENDING"
          : "PENDING")) as any;

    let options: string[] = [];
    if (Array.isArray(q.options)) {
      if (q.options.length && typeof q.options[0] === "string") {
        options = q.options as string[];
      } else {
        const arr = (q.options as any[])
          .map((o) =>
            o?.text
              ? { text: String(o.text), orderIndex: Number(o.orderIndex ?? 0) }
              : null
          )
          .filter(Boolean) as { text: string; orderIndex: number }[];
        arr.sort((a, b) => a.orderIndex - b.orderIndex);
        options = arr.map((o) => o.text);
      }
    } else if (Array.isArray(q.optionTexts)) {
      options = (q.optionTexts as any[]).map(String);
    }

    let correctIndex = Number(
      q.correctIndex ?? q.correct_option_index ?? q.correctOptionIndex ?? 0
    );
    if (!(correctIndex >= 0 && correctIndex < options.length)) correctIndex = 0;

    const dq = q.diagram || q.Diagram || null;
    const diagram = dq
      ? {
          id: String(dq.id ?? ""),
          title: String(dq.title ?? dq.name ?? ""),
          path: (toAbs(dq.path ?? dq.imagePath ?? null) || undefined) as
            | string
            | undefined,
        }
      : q.diagramTitle || q.diagramPath || q.diagramId
      ? {
          id: String(q.diagramId ?? ""),
          title: String(q.diagramTitle ?? ""),
          path: (toAbs(q.diagramPath ?? q.diagram_image ?? null) || undefined) as
            | string
            | undefined,
        }
      : undefined;

    return {
      id: String(q.id),
      prompt: String(q.prompt ?? ""),
      status,
      reviewComment: q.reviewComment ?? null,
      diagram,
      createdAt: q.createdAt,
      reviewedAt: q.reviewedAt ?? null,
      options,
      correctIndex,
    } as SupQuestionItem;
  });
}

/* ===================== Tests (list) ===================== */

export async function supListUserSessions(
  studentId: string,
  {
    mode,
    dateFrom,
    dateTo,
    q,
  }: {
    mode?: "learning" | "exam" | "errors";
    dateFrom?: string;
    dateTo?: string;
    q?: string;
  }
) {
  const qs = new URLSearchParams();
  if (mode) qs.set("mode", mode);
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo) qs.set("dateTo", dateTo);
  if (q) qs.set("q", q);

  const data = await getJSON(
    `/api/supervisor/students/${studentId}/tests${
      qs.toString() ? `?${qs.toString()}` : ""
    }`
  );

  const rows = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
    ? data
    : [];

  return rows.map((s: any) => ({
    ...s,
    diagram: s.diagram
      ? {
          id: s.diagram.id,
          title: s.diagram.title,
          path: toAbs(s.diagram.path ?? null),
        }
      : null,
  })) as SupSessionSummary[];
}

/* ===================== Tests (detail) ===================== */

import type { SessionDetail, TestResultItem } from "./tests";

export async function supGetSessionDetail(
  studentId: string,
  sessionId: string
): Promise<SessionDetail> {
  const url = `/api/supervisor/students/${studentId}/tests/${sessionId}`;
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
      typeof r.isCorrect === "boolean"
        ? r.isCorrect
        : typeof r.correctIndex === "number" &&
          typeof r.selectedIndex === "number"
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
      typeof data.durationSeconds === "number"
        ? data.durationSeconds
        : data.totals?.durationSeconds ?? null,
    diagram: data.diagram
      ? {
          id: data.diagram.id,
          title: data.diagram.title,
          path: toAbs(data.diagram.path ?? null),
        }
      : null,
    totals: {
      totalQuestions: Number(
        data.totals?.totalQuestions ?? data.totalQuestions ?? results.length
      ),
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
        data.totals?.wrong ??
          data.wrong ??
          results.filter((r) => r.isCorrect === false).length
      ),
      skipped: Number(
        data.totals?.skipped ??
          data.skipped ??
          results.filter((r) => r.selectedIndex === null).length
      ),
      usedHints: Number(
        data.totals?.usedHints ??
          data.usedHints ??
          results.filter((r) => r.usedHint).length
      ),
      revealed: Number(
        data.totals?.revealed ??
          data.revealed ??
          results.filter((r) => r.revealedAnswer).length
      ),
      score:
        typeof data.totals?.score === "number"
          ? data.totals.score
          : typeof data.score === "number"
          ? data.score
          : null,
    },
    summary: {
      durationSeconds:
        typeof data.durationSeconds === "number"
          ? data.durationSeconds
          : data.totals?.durationSeconds ?? null,
      accuracyPct:
        typeof data.accuracyPct === "number"
          ? data.accuracyPct
          : data.totals?.accuracyPct ?? null,
      score:
        typeof data.score === "number"
          ? data.score
          : data.totals?.score ?? null,
    },
    results,
    events: Array.isArray(data.events) ? data.events : undefined,
  };

  return detail;
}

/* ===================== Claims list ===================== */

export async function supListUserClaims(studentId: string) {
  const data = await getJSON(`/api/supervisor/students/${studentId}/claims`);
  const rows = Array.isArray(data) ? data : data.items || [];

  return rows.map((c: any) => ({
    ...c,
    diagram: c.diagram
      ? {
          ...c.diagram,
          path: (toAbs(c.diagram.path ?? null) || undefined) as
            | string
            | undefined,
        }
      : c.diagram,
  })) as SupClaimItem[];
}

/* ===================== Weekly Goal (admin) ===================== */

export async function supGetWeeklyGoal() {
  return await getJSON(`/api/supervisor/weekly-goal`);
}

export async function supPutWeeklyGoal(payload: {
  targetTests: number;
  weekStart?: string;
  weekEnd?: string;
  notify?: boolean;
}) {
  const url = `/api/supervisor/weekly-goal`;

  let res = await fetchAuth(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (
    !res.ok &&
    (res.status === 404 || res.status === 405 || res.status === 501)
  ) {
    res = await fetchAuth(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as any)?.error || "No se pudo guardar el objetivo");
  return data;
}

export async function supGetWeeklyProgress(params?: {
  weekStart?: string;
  weekEnd?: string;
  userId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.weekStart) qs.set("weekStart", params.weekStart);
  if (params?.weekEnd) qs.set("weekEnd", params.weekEnd);
  if (params?.userId) qs.set("userId", params.userId);

  const res = await fetchAuth(
    `/api/supervisor/weekly-goal/progress${
      qs.toString() ? `?${qs.toString()}` : ""
    }`
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as any)?.error || "No disponible");
  return Array.isArray(data) ? data : [];
}

export async function supGetStudentBadges(studentId: string) {
  const data = await getJSON(`/api/supervisor/students/${studentId}/badges`);
  return Array.isArray(data) ? data : [];
}