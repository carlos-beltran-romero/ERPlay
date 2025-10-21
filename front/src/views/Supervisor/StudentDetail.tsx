// src/views/Supervisor/StudentDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageWithHeader from "../PageWithHeader";
import { toast } from "react-toastify";
import badgeCompleted from "../../assets/completed.png";
import {
  supGetStudent,
  supGetOverview,
  supGetTrends,
  supGetErrors,
  supGetClaimsStats,
  supGetCreatedQuestions,
  supListUserSessions,
  supListUserClaims,
  supGetWeeklyProgress,          // ⬅️ nuevo
  supGetStudentBadges,           // ⬅️ nuevo
  type SupStudent,
  type SupOverview,
  type SupTrendPoint,
  type SupErrorItem,
  type SupClaimsStats,
  type SupQuestionItem,
  type SupSessionSummary,
  type SupClaimItem,
  type WeeklyProgressRow,        // ⬅️ nuevo
  type SupBadgeItem,             // ⬅️ nuevo
} from "../../services/supervisor";
import { getSessionDetail, type SessionDetail } from "../../services/tests";
import {
  ArrowLeft,
  UserRound,
  BarChart3,
  LineChart,
  Activity,
  Trophy,
  Clock,
  Gauge,
  Flame,
  CheckCircle,
  XCircle,
  MailCheck,
  Search,
  Filter,
  Image as ImageIcon,
  Flag,
  Eye,
  X as CloseIcon,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Target,                         // ⬅️ nuevo
  Award,                          // ⬅️ nuevo
} from "lucide-react";

/* ---------- Helpers ---------- */
const fmtPct = (n?: number | null) =>
  typeof n === "number" ? `${Math.round(n)}%` : "—";
const fmtSec1 = (sec?: number | null) =>
  sec == null ? "—" : `${Math.max(0, sec).toFixed(1)} s`;
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "—";
const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";
const fmtDuration = (sec?: number | null) => {
  if (sec == null) return "—";
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m ${r}s`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
};
const letter = (i?: number) =>
  typeof i === "number" && i >= 0 ? String.fromCharCode(65 + i) : "—";
const normStatus = (s?: string | null) => {
  const u = String(s || "").toUpperCase();
  if (u === "APPROVED") return "APPROVED";
  if (u === "REJECTED") return "REJECTED";
  return "PENDING";
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = normStatus(status);
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium";
  if (s === "APPROVED")
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
      >
        <CheckCircle2 size={12} /> Aprobada
      </span>
    );
  if (s === "REJECTED")
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
        <XCircle size={12} /> Rechazada
      </span>
    );
  return (
    <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
      <Clock size={12} /> Pendiente
    </span>
  );
};

/* ---------- UI shells ---------- */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow transition ${
      className || ""
    }`}
  >
    {children}
  </div>
);
const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={`p-5 ${className || ""}`}>{children}</div>;
const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <Card>
    <CardBody className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-gray-50 text-gray-700">{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <span className="text-xl font-semibold leading-tight">{value}</span>
      </div>
    </CardBody>
  </Card>
);

/* ---------- Mini-charts ---------- */
const DualLineChart: React.FC<{
  data: { a?: number | null; b?: number | null }[];
}> = ({ data }) => {
  const W = 640,
    H = 220,
    P = 28;
  const n = data.length || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, n - 1);
  const y = (v: number) => H - P - (v * (H - 2 * P)) / 100;
  const makePath = (key: "a" | "b") =>
    data.reduce((acc, d, i) => {
      const v = (d as any)[key];
      if (v == null) return acc;
      return acc + `${acc ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    }, "");
  const hasAny = data.some((d) => d.a != null || d.b != null);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-56"
      role="img"
      aria-label="Acierto vs nota"
    >
      <rect x={0} y={0} width={W} height={H} fill="white" />
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line
            x1={P}
            x2={W - P}
            y1={y(g)}
            y2={y(g)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text x={8} y={y(g) + 4} fontSize={10} fill="#6b7280">
            {g}%
          </text>
        </g>
      ))}
      <line
        x1={P}
        x2={W - P}
        y1={H - P}
        y2={H - P}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      {hasAny ? (
        <>
          <path
            d={makePath("a")}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.25}
          />
          <path
            d={makePath("b")}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.25}
          />
        </>
      ) : (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#6b7280"
        >
          Sin datos suficientes
        </text>
      )}
    </svg>
  );
};
const ScrollableGroupedBars: React.FC<{
  data: { label: string; ok: number; ko: number }[];
}> = ({ data }) => {
  const P = 28,
    H = 220,
    step = 30;
  const max = Math.max(1, ...data.map((d) => d.ok + d.ko));
  const y = (v: number) => H - P - (v * (H - 2 * P)) / max;
  const W = P * 2 + data.length * step;
  const barW = Math.max(6, (step - 8) / 2);
  return (
    <div className="overflow-x-auto pb-2">
      <svg width={W} height={H} role="img" aria-label="Preguntas por día">
        <rect x={0} y={0} width={W} height={H} fill="white" />
        {[0, 0.25, 0.5, 0.75, 1].map((g, idx) => (
          <g key={idx}>
            <line
              x1={P}
              x2={W - P}
              y1={y(max * g)}
              y2={y(max * g)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text x={8} y={y(max * g) + 4} fontSize={10} fill="#9ca3af">
              {Math.round(max * g)}
            </text>
          </g>
        ))}
        <line
          x1={P}
          x2={W - P}
          y1={H - P}
          y2={H - P}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const x0 = P + i * step;
          const yOk = y(d.ok),
            yKo = y(d.ko);
          return (
            <g key={i}>
              <rect
                x={x0 + 2}
                y={yOk}
                width={barW}
                height={H - P - yOk}
                fill="#10b981"
                rx={3}
              />
              <rect
                x={x0 + 2 + barW + 4}
                y={yKo}
                width={barW}
                height={H - P - yKo}
                fill="#f43f5e"
                rx={3}
              />
              {(i % 5 === 0 || i === data.length - 1) && (
                <text
                  x={x0 + step / 2}
                  y={H - P + 12}
                  fontSize={9}
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
const Donut: React.FC<{ value: number }> = ({ value }) => {
  const size = 56,
    stroke = 8,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, value));
  const dash = (p / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#e5e7eb"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#10b981"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="12"
        fill="#111827"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
};

// ---- Fallback "mejor racha" a partir de trends (consecutivos días con actividad) ----
function calcBestStreakFromTrends(rows: SupTrendPoint[]): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const data = [...rows]
    .filter((r) => !!r.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  let best = 0;
  let current = 0;
  let prev: Date | null = null;

  const atMidnight = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const diffDays = (a: Date, b: Date) =>
    Math.round((b.getTime() - a.getTime()) / 86400000);

  for (const r of data) {
    const active = (r.correctCount ?? 0) + (r.incorrectCount ?? 0) > 0;
    const d = atMidnight(new Date(r.date));
    if (prev && diffDays(prev, d) === 1) {
      current = active ? current + 1 : 0;
    } else {
      current = active ? 1 : 0;
    }
    prev = d;
    if (current > best) best = current;
  }
  return best;
}

/* ---------- Componente ---------- */
const StudentDetail: React.FC = () => {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"progress" | "tests" | "questions" | "claims">(
    "progress"
  );
  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState<SupStudent | null>(null);
  const [ov, setOv] = useState<SupOverview | null>(null);
  const [trends, setTrends] = useState<SupTrendPoint[]>([]);
  const bestStreakDisplay = useMemo(() => {
    const val = typeof ov?.bestStreakDays === 'number' ? ov.bestStreakDays : 0;
    if (val > 0) return `${val} días`;
    const fb = calcBestStreakFromTrends(trends);
    return fb ? `${fb} días` : '—';
  }, [ov?.bestStreakDays, trends]);
  
  const [errorsTop, setErrorsTop] = useState<SupErrorItem[]>([]);
  const [claimsStats, setClaimsStats] = useState<SupClaimsStats | null>(null);
  const [myQuestions, setMyQuestions] = useState<SupQuestionItem[]>([]);
  const [tests, setTests] = useState<SupSessionSummary[]>([]);
  const [claims, setClaims] = useState<SupClaimItem[]>([]);

  // NUEVO: progreso semanal e insignias
  const [progRows, setProgRows] = useState<WeeklyProgressRow[]>([]);  // ✅
  const [bgs, setBgs] = useState<SupBadgeItem[]>([]);                // ✅
  const [showBadges, setShowBadges] = useState(false);

  // tests filtros
  const [mode, setMode] = useState<"ALL" | "learning" | "exam" | "errors">(
    "ALL"
  );
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // claims filtros
  const [qClaims, setQClaims] = useState("");
  const [stClaims, setStClaims] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");

  // zoom imagen
  const [previewImg, setPreviewImg] = useState<{
    src: string;
    title: string;
  } | null>(null);

  // detalle test
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [
          stu,
          ovw,
          tr,
          er,
          cs,
          qs,
          ts,
          cl,
          rows,            // ⬅️ progreso semanal
          badges           // ⬅️ insignias
        ] = await Promise.all([
          supGetStudent(studentId),
          supGetOverview(studentId),
          supGetTrends(studentId, { bucket: "day" }),
          supGetErrors(studentId, 5),
          supGetClaimsStats(studentId),
          supGetCreatedQuestions(studentId, { limit: 200 }),
          supListUserSessions(studentId, {}),
          supListUserClaims(studentId),
          supGetWeeklyProgress({ userId: studentId }), // ✅
          supGetStudentBadges(studentId),              // ✅
        ]);
        setStudent(stu);
        setOv(ovw);
        setTrends(tr);
        setErrorsTop(er);
        setClaimsStats(cs);
        setMyQuestions(qs);
        setTests(ts);
        setClaims(cl);
        setProgRows(rows || []);
        setBgs(badges || []);
      } catch (e: any) {
        toast.error(e?.message || "No se pudo cargar el detalle del alumno");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  /* ------- Derivados ------- */
  const lineData = useMemo(
    () =>
      trends.map((t) => ({
        a: t.accuracyLearningPct ?? null,
        b: t.examScorePct ?? null,
      })),
    [trends]
  );
  const barsData = useMemo(
    () =>
      trends.map((t) => ({
        label: t.date.slice(5),
        ok: t.correctCount ?? 0,
        ko: t.incorrectCount ?? 0,
      })),
    [trends]
  );
  const qCounts = useMemo(() => {
    const c = { approved: 0, rejected: 0, pending: 0 };
    for (const q of myQuestions) {
      const st = normStatus((q as any).status);
      if (st === "APPROVED") c.approved++;
      else if (st === "REJECTED") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [myQuestions]);

  const filteredTests = useMemo(() => {
    const text = q.trim().toLowerCase();
    return tests.filter((it) => {
      const okMode = mode === "ALL" ? true : it.mode === mode;
      const inTxt =
        !text ||
        it.diagram?.title?.toLowerCase().includes(text) ||
        (it.summary?.noteLabel?.toLowerCase?.().includes(text) ?? false);
      const started = it.startedAt ? new Date(it.startedAt) : null;
      const after = dateFrom
        ? started && started >= new Date(dateFrom + "T00:00:00")
        : true;
      const before = dateTo
        ? started && started <= new Date(dateTo + "T23:59:59")
        : true;
      return okMode && inTxt && after && before;
    });
  }, [tests, mode, q, dateFrom, dateTo]);

  const filteredClaims = useMemo(() => {
    const t = qClaims.trim().toLowerCase();
    return claims.filter((c) => {
      const ok =
        stClaims === "ALL" ? true : normStatus((c as any).status) === stClaims;
      const txt =
        !t ||
        (c as any).promptSnapshot?.toLowerCase?.().includes(t) ||
        (c.diagram?.title?.toLowerCase?.().includes(t) ?? false);
      return ok && txt;
    });
  }, [claims, qClaims, stClaims]);

  /* ------- Nota robusta para EXAM en el modal ------- */
  const examScore = useMemo(() => {
    if (!detail || detail.mode !== "exam") return null;
    const s1 =
      typeof detail.summary?.score === "number" ? detail.summary.score : null;
    const s2 =
      typeof detail.totals?.score === "number" ? detail.totals.score : null;
    if (s1 != null) return s1;
    if (s2 != null) return s2;
    const total = detail.totals?.totalQuestions ?? 0;
    const correct = detail.totals?.correct ?? 0;
    return total > 0 ? Math.round((correct / total) * 100) / 10 : null; // 0..10 con 1 decimal
  }, [detail]);

  /* ------- Abrir detalle test ------- */
  const openDetail = async (summary: SupSessionSummary) => {
    const sessionId: any = (summary as any).sessionId ?? (summary as any).id;
    if (!sessionId) {
      toast.error("No se pudo identificar la sesión.");
      return;
    }
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      // intenta supervisor si existe
      let d: any = null;
      try {
        const supMod: any = await import("../../services/supervisor");
        if (typeof supMod.supGetSessionDetail === "function") {
          d = await supMod.supGetSessionDetail(
            String(studentId),
            String(sessionId)
          );
        }
      } catch {
        /* noop */
      }
      if (!d) {
        d = await getSessionDetail(String(sessionId));
      }
      setDetail(d);
    } catch (e: any) {
      setDetail(null);
      toast.error(e?.message || "No se pudo cargar el detalle de la sesión");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  // Helper progress row (si hay varias filas, buscamos por userId)
  const progRow: WeeklyProgressRow | null = useMemo(() => {
    if (!progRows?.length) return null;
    const found = progRows.find((r) => r.userId === studentId);
    return found || progRows[0];
  }, [progRows, studentId]);

  if (loading) {
    return (
      <PageWithHeader>
        <div className="mx-auto w-full max-w-6xl p-6">Cargando…</div>
      </PageWithHeader>
    );
  }

  const renderResolution = (txt?: string | null) => {
    return txt?.trim() ? (
      <div className="inline-flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <MessageSquare size={14} className="mt-0.5" />
        <span>{txt}</span>
      </div>
    ) : null;
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <UserRound size={16} /> Alumno
              </div>
              <h1 className="text-2xl font-semibold">
                {student?.name} {student?.lastName}
              </h1>
              <div className="text-sm text-gray-600">{student?.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["progress", "Progreso", BarChart3],
                ["tests", "Tests", LineChart],
                ["questions", "Preguntas", Activity],
                ["claims", "Reclamaciones", Flag],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
                  tab === key
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== PROGRESO ===== */}
        {tab === "progress" && (
          <div className="space-y-8">
            {/* KPIs */}
            {ov && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPI
                  icon={<Activity className="h-5 w-5" />}
                  label="Preguntas respondidas"
                  value={ov.answeredCount}
                />
                <KPI
                  icon={<Trophy className="h-5 w-5" />}
                  label="Nota media (examen)"
                  value={`${ov.examScoreAvg.toFixed(1)}/10`}
                />
                <KPI
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Acierto (learning)"
                  value={fmtPct(ov.accuracyLearningPct)}
                />
                <KPI
                  icon={<Clock className="h-5 w-5" />}
                  label="Tiempo medio/preg."
                  value={fmtSec1(ov.avgTimePerQuestionSec)}
                />
                <KPI
                  icon={<Gauge className="h-5 w-5" />}
                  label="Sesiones completadas"
                  value={ov.sessionsCompleted}
                />

                {/* 👉 KPI de Insignias en lugar de “Mejor racha” (clicable para abrir el modal) */}
                <Card>
                  <button
                    type="button"
                    onClick={() => setShowBadges(true)}
                    className="w-full text-left"
                    aria-label="Abrir insignias"
                    title="Haz clic para ver las insignias"
                  >
                    <CardBody className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gray-50 text-indigo-700">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          Insignias
                        </span>
                        <span className="text-xl font-semibold leading-tight">
                          {bgs.length}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          Haz clic para ver
                        </span>
                      </div>
                    </CardBody>
                  </button>
                </Card>
              </div>
            )}

            {/* Objetivo semanal */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Target className="h-4 w-4 text-indigo-600" />
                    Objetivo semanal
                  </div>
                  {progRow ? (
                    <>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progreso</span>
                        <span>
                          {progRow.done} / {progRow.target} tests
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, progRow.pct)
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Estado:{" "}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 ${
                            progRow.completed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {progRow.completed ? "Completado" : "En progreso"}
                        </span>
                      </div>

                      {/* Insignia al completar */}
                      {progRow.completed && (
                        <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                          <img
                            src={badgeCompleted}
                            alt="Insignia: objetivo semanal completado"
                            className="h-10 w-10 object-contain rounded-lg shadow-sm"
                            loading="lazy"
                          />
                          <div className="text-sm font-medium text-emerald-800">
                            ¡Objetivo semanal completado!
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Sin objetivo activo esta semana.
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Evolución */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="text-sm font-medium mb-2">
                    Acierto (learning) vs Nota (examen)
                  </div>
                  <DualLineChart data={lineData} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-sm font-medium mb-2">
                    Preguntas por día (correctas vs incorrectas)
                  </div>
                  <ScrollableGroupedBars data={barsData} />
                </CardBody>
              </Card>
            </div>

            {/* Reclamaciones + Preguntas creadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <div className="text-lg font-semibold mb-3">
                    Reclamaciones
                  </div>
                  {claimsStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs uppercase text-gray-500">
                            Aprobadas
                          </div>
                          <div className="text-2xl font-semibold">
                            {claimsStats.approved}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                          <MailCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs uppercase text-gray-500">
                            Enviadas
                          </div>
                          <div className="text-2xl font-semibold">
                            {claimsStats.submitted}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Donut
                          value={
                            (claimsStats.approved /
                              Math.max(1, claimsStats.submitted)) *
                            100
                          }
                        />
                        <div>
                          <div className="text-sm font-medium">
                            Tasa de aprobación
                          </div>
                          <div className="text-xs text-gray-500">
                            Aprobadas / Enviadas
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Sin datos.</div>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="text-lg font-semibold mb-3">
                    Preguntas creadas
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase text-gray-500">
                          Aprobadas
                        </div>
                        <div className="text-2xl font-semibold">
                          {qCounts.approved}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase text-gray-500">
                          Rechazadas
                        </div>
                        <div className="text-2xl font-semibold">
                          {qCounts.rejected}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Donut
                        value={
                          qCounts.approved + qCounts.rejected
                            ? (qCounts.approved /
                                (qCounts.approved + qCounts.rejected)) *
                              100
                            : 0
                        }
                      />
                      <div>
                        <div className="text-sm font-medium">
                          Tasa de aprobación
                        </div>
                        <div className="text-xs text-gray-500">
                          Aprobadas / Revisadas
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {!!errorsTop.length && (
              <Card>
                <CardBody>
                  <div className="text-lg font-semibold mb-3">
                    Errores frecuentes
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {errorsTop.map((e) => (
                      <div
                        key={(e as any).id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="text-sm font-medium">
                          {(e as any).title}
                        </div>
                        <div className="text-sm mt-1">
                          Tasa de error:{" "}
                          <span className="font-semibold">
                            {fmtPct((e as any).errorRatePct)}
                          </span>
                        </div>
                        {(e as any).commonChosenText ? (
                          <div className="text-xs text-gray-500 mt-1">
                            Opción más elegida:{" "}
                            <span className="italic">
                              {(e as any).commonChosenText}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* ===== TESTS ===== */}
        {tab === "tests" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por diagrama/nota…"
                    className="w-64 rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(["ALL", "learning", "exam", "errors"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-full px-3 py-1.5 text-sm border ${
                        mode === m
                          ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {m === "ALL"
                        ? "Todos"
                        : m === "learning"
                        ? "Aprendizaje"
                        : m === "exam"
                        ? "Examen"
                        : "Errores"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <span className="text-gray-500 text-sm">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <div className="col-span-5">Diagrama</div>
                <div className="col-span-2">Modo</div>
                <div className="col-span-2">Preguntas</div>
                <div className="col-span-2">Fecha</div>
                <div className="col-span-1 text-right">Ver</div>
              </div>
              {filteredTests.length === 0 ? (
                <div className="p-6 text-gray-500">Sin tests.</div>
              ) : (
                <div className="divide-y">
                  {filteredTests.map((it) => {
                    const acc =
                      it.mode === "exam"
                        ? typeof it.summary?.score === "number"
                          ? `Nota: ${it.summary.score}`
                          : "Nota: —"
                        : typeof it.summary?.accuracyPct === "number"
                        ? `Acierto: ${it.summary.accuracyPct}%`
                        : "Acierto: —";
                    return (
                      <div
                        key={(it as any).id || (it as any).sessionId}
                        className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50"
                      >
                        <div className="col-span-5">
                          <div className="font-medium whitespace-normal break-words">
                            {it.diagram?.title || "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {acc} · {fmtDuration(it.summary?.durationSeconds)}
                          </div>
                        </div>
                        <div className="col-span-2 text-sm">
                          {it.mode === "learning"
                            ? "Aprendizaje"
                            : it.mode === "exam"
                            ? "Examen"
                            : "Errores"}
                        </div>
                        <div className="col-span-2 text-sm">
                          {it.questionCount ?? 0}
                        </div>
                        <div className="col-span-2 text-sm">
                          {fmtDateTime(it.startedAt)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => openDetail(it)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            title="Ver detalle"
                          >
                            <Eye size={16} /> Ver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PREGUNTAS ===== */}
        {tab === "questions" && (
          <Card>
            <CardBody>
              {myQuestions.length === 0 ? (
                <div className="text-gray-500">Sin preguntas creadas.</div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                    <div className="col-span-1">Diagrama</div>
                    <div className="col-span-5">Enunciado</div>
                    <div className="col-span-3">Opciones</div>
                    <div className="col-span-1 text-center">Estado</div>
                    <div className="col-span-2">Resolución</div>
                  </div>
                  <div className="divide-y">
                    {myQuestions.map((q) => {
                      const qi: any = q;
                      const options = Array.isArray(qi.options)
                        ? [...qi.options].sort(
                            (a: any, b: any) =>
                              (a?.orderIndex ?? 0) - (b?.orderIndex ?? 0)
                          )
                        : [];
                      const correctIdx: number | undefined =
                        typeof qi.correctOptionIndex === "number"
                          ? qi.correctOptionIndex
                          : undefined;

                      return (
                        <div
                          key={(qi as any).id}
                          className="grid grid-cols-12 gap-3 px-4 py-3 items-start"
                        >
                          {/* Diagrama */}
                          <div className="col-span-1">
                            {qi.diagram?.path ? (
                              <img
                                src={qi.diagram.path}
                                alt={qi.diagram.title || "Diagrama"}
                                title="Haz clic para ampliar"
                                className="h-12 w-12 object-cover rounded border cursor-zoom-in"
                                onClick={() =>
                                  setPreviewImg({
                                    src: qi.diagram!.path!,
                                    title: qi.diagram?.title || "Diagrama",
                                  })
                                }
                              />
                            ) : (
                              <div className="h-12 w-12 grid place-items-center rounded border text-gray-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>

                          {/* Enunciado */}
                          <div className="col-span-5">
                            <div className="font-medium">{qi.prompt}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {qi.diagram?.title || "—"}
                              {qi.createdAt
                                ? ` · Creada el ${fmtDate(qi.createdAt)}`
                                : ""}
                            </div>
                          </div>

                          {/* Opciones */}
                          <div className="col-span-3">
                            {options.length ? (
                              <div className="space-y-1">
                                {options.map((op: any, i: number) => (
                                  <div
                                    key={op.id || i}
                                    className={`rounded-lg border px-2 py-1 text-sm ${
                                      i === correctIdx
                                        ? "border-emerald-300 bg-emerald-50"
                                        : "border-gray-200 bg-white"
                                    }`}
                                  >
                                    <span className="font-semibold mr-2">
                                      {letter(i)}.
                                    </span>
                                    {op.text}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">—</div>
                            )}
                          </div>

                          {/* Estado */}
                          <div className="col-span-1 flex items-center justify-center">
                            <StatusBadge status={qi.status} />
                          </div>

                          {/* Resolución */}
                          <div className="col-span-2">
                            {normStatus(qi.status) === "REJECTED"
                              ? renderResolution(qi.reviewComment)
                              : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* ===== RECLAMACIONES ===== */}
        {tab === "claims" && (
          <div className="space-y-4">
            {/* filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={qClaims}
                  onChange={(e) => setQClaims(e.target.value)}
                  placeholder="Buscar por enunciado/diagrama…"
                  className="w-64 rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={stClaims}
                  onChange={(e) => setStClaims(e.target.value as any)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="APPROVED">Aprobada</option>
                  <option value="REJECTED">Rechazada</option>
                </select>
              </div>
            </div>

            {/* tabla */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <div className="col-span-1">Diagrama</div>
                <div className="col-span-5">Enunciado</div>
                <div className="col-span-3">Tu resp. / Test</div>
                <div className="col-span-1 text-center">Estado</div>
                <div className="col-span-2">Resolución</div>
              </div>
              {filteredClaims.length === 0 ? (
                <div className="p-6 text-gray-500">Sin reclamaciones.</div>
              ) : (
                <div className="divide-y">
                  {filteredClaims.map((c) => {
                    const ci: any = c;

                    const letter = (i?: number) =>
                      typeof i === "number" && i >= 0
                        ? String.fromCharCode(65 + i)
                        : "—";

                    // Lectura “como alumno”
                    const prompt =
                      ci.promptSnapshot ??
                      ci.prompt ??
                      ci.question?.prompt ??
                      "—";

                    const options: string[] = Array.isArray(ci.optionsSnapshot)
                      ? ci.optionsSnapshot
                      : Array.isArray(ci.options)
                      ? ci.options
                      : [];

                    const chosenIndex: number | undefined =
                      typeof ci.chosenIndex === "number"
                        ? ci.chosenIndex
                        : undefined;

                    const correctIndex: number | undefined =
                      typeof ci.correctIndexAtSubmission === "number"
                        ? ci.correctIndexAtSubmission
                        : typeof ci.correctIndex === "number"
                        ? ci.correctIndex
                        : undefined;

                    const chosenTxt =
                      typeof chosenIndex === "number" && options?.[chosenIndex]
                        ? `${letter(chosenIndex)}. ${options[chosenIndex]}`
                        : typeof chosenIndex === "number"
                        ? letter(chosenIndex)
                        : "—";

                    const correctTxt =
                      typeof correctIndex === "number" &&
                      options?.[correctIndex]
                        ? `${letter(correctIndex)}. ${options[correctIndex]}`
                        : typeof correctIndex === "number"
                        ? letter(correctIndex)
                        : "—";

                    return (
                      <div
                        key={ci.id}
                        className="grid grid-cols-12 gap-3 px-4 py-3 items-start"
                      >
                        {/* Diagrama */}
                        <div className="col-span-1">
                          {ci.diagram?.path ? (
                            <img
                              src={ci.diagram.path}
                              alt={ci.diagram.title || "Diagrama"}
                              title="Haz clic para ampliar"
                              className="h-12 w-12 object-cover rounded border cursor-zoom-in"
                              onClick={() =>
                                setPreviewImg({
                                  src: ci.diagram!.path!,
                                  title: ci.diagram?.title || "Diagrama",
                                })
                              }
                            />
                          ) : (
                            <div className="h-12 w-12 grid place-items-center rounded border text-gray-400">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </div>

                        {/* Enunciado + meta */}
                        <div className="col-span-5">
                          <div className="font-medium whitespace-normal break-words">
                            {prompt}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {ci.diagram?.title?.trim() || "—"}
                            {ci.createdAt
                              ? ` · Enviada el ${fmtDate(ci.createdAt)}`
                              : ""}
                          </div>
                        </div>

                        {/* Tu resp. / Test (igual que alumno) */}
                        <div className="col-span-3">
                          <div className="text-xs text-gray-500">
                            Tu respuesta
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm">
                            {chosenTxt}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Respuesta del test
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm">
                            {correctTxt}
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="col-span-1 flex items-center justify-center">
                          <StatusBadge status={ci.status} />
                        </div>

                        {/* Resolución */}
                        <div className="col-span-2">
                          {normStatus(ci.status) === "REJECTED"
                            ? renderResolution(
                                ci.reviewerComment ?? ci.resolution?.comment
                              )
                            : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal imagen */}
        {previewImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewImg(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-[95vw] rounded-lg bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImg(null)}
                className="absolute right-2 top-2 rounded p-1 text-gray-600 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <CloseIcon size={18} />
              </button>
              <div className="mb-2 text-sm font-medium text-gray-700">
                {previewImg.title}
              </div>
              <div className="flex items-center justify-center">
                <img
                  src={previewImg.src}
                  alt={previewImg.title}
                  className="max-h-[75vh] max-w-[90vw] object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal detalle test */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 md:p-6">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <div className="text-xs text-gray-500">Diagrama</div>
                  <h2 className="text-lg font-semibold">
                    {detail?.diagram?.title || "—"}
                  </h2>
                  <div className="mt-1 text-xs text-gray-500">
                    {detail
                      ? `${
                          detail.mode === "learning"
                            ? "Aprendizaje"
                            : detail.mode === "exam"
                            ? "Examen"
                            : "Errores"
                        } · ${fmtDateTime(detail.startedAt)}${
                          detail.finishedAt
                            ? ` · ${fmtDateTime(detail.finishedAt)}`
                            : ""
                        }`
                      : "—"}
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
                  aria-label="Cerrar"
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div className="p-5 max-h-[80vh] overflow-auto">
                {detailLoading ? (
                  <div className="inline-flex items-center gap-2 text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                    detalle…
                  </div>
                ) : !detail ? (
                  <div className="text-gray-500">
                    No se pudo cargar el detalle.
                  </div>
                ) : (
                  <>
                    <div
                      className={`grid grid-cols-2 ${
                        detail.mode === "exam"
                          ? "md:grid-cols-4"
                          : "md:grid-cols-5"
                      } gap-3`}
                    >
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                        <div className="text-xs text-gray-500">Duración</div>
                        <div className="text-base font-semibold">
                          {fmtDuration(
                            (detail as any).durationSeconds ??
                              (detail as any).summary?.durationSeconds
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                        <div className="text-xs text-gray-500">
                          {detail.mode === "exam" ? "Nota" : "Acierto"}
                        </div>
                        <div className="text-base font-semibold">
                          {detail.mode === "exam"
                            ? typeof examScore === "number"
                              ? examScore
                              : "—"
                            : (() => {
                                const pct1 =
                                  typeof (detail as any).summary
                                    ?.accuracyPct === "number"
                                    ? (detail as any).summary.accuracyPct
                                    : null;
                                const total =
                                  (detail as any).totals?.totalQuestions || 0;
                                const correct =
                                  (detail as any).totals?.correct || 0;
                                const pct2 = total
                                  ? Math.round((100 * correct) / total)
                                  : null;
                                const pct = pct1 ?? pct2;
                                return typeof pct === "number"
                                  ? `${pct}%`
                                  : "—";
                              })()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                        <div className="text-xs text-gray-500">Preguntas</div>
                        <div className="text-base font-semibold">
                          {detail.results?.length ?? 0}
                        </div>
                      </div>
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                        <div className="text-xs text-gray-500">Fecha</div>
                        <div className="text-base font-semibold">
                          {fmtDate(detail.startedAt)}
                        </div>
                      </div>
                      {detail.mode !== "exam" && (
                        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                          <div className="text-xs text-gray-500">
                            Reclamaciones
                          </div>
                          <div className="text-base font-semibold">
                            {
                              (detail.results || []).filter(
                                (r: any) => !!(r.claimed || r.claimId)
                              ).length
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {detail.diagram?.path ? (
                        <img
                          src={detail.diagram.path}
                          alt={detail.diagram.title || "Diagrama"}
                          className="max-h-[24rem] w-full rounded-lg border object-contain"
                        />
                      ) : (
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="mb-3 text-sm text-gray-600">
                        Preguntas
                      </div>
                      <div className="space-y-3">
                        {(detail.results ?? []).map((r: any, idx: number) => {
                          const isExam = detail.mode === "exam";
                          const showCorrect =
                            typeof r.correctIndex === "number";
                          const answered = typeof r.selectedIndex === "number";
                          const isCorrect =
                            answered &&
                            showCorrect &&
                            r.selectedIndex === r.correctIndex;
                          const claimed = !isExam && !!(r.claimed || r.claimId);

                          return (
                            <div
                              key={r.resultId || idx}
                              className={`rounded-xl border p-4 ${
                                answered
                                  ? isCorrect
                                    ? "border-emerald-300 bg-emerald-50"
                                    : showCorrect
                                    ? "border-rose-300 bg-rose-50"
                                    : "border-gray-200 bg-white"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm font-medium break-words">
                                  {idx + 1}. {r.prompt}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {!isExam && claimed && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                                      <Flag size={12} /> Reclamada
                                    </span>
                                  )}
                                  {answered ? (
                                    showCorrect ? (
                                      isCorrect ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                          <CheckCircle2 size={12} /> Correcta
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                                          <XCircle size={12} /> Incorrecta
                                        </span>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                                        Respondida
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                                      —
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 space-y-1">
                                {(r.options ?? []).map(
                                  (txt: string, oi: number) => {
                                    const right =
                                      showCorrect && r.correctIndex === oi;
                                    const chosen =
                                      typeof r.selectedIndex === "number" &&
                                      r.selectedIndex === oi;
                                    return (
                                      <div
                                        key={oi}
                                        className={`rounded-lg border px-3 py-2 text-sm ${
                                          right
                                            ? "border-emerald-300 bg-emerald-50"
                                            : chosen && showCorrect && !right
                                            ? "border-rose-300 bg-rose-50"
                                            : chosen && !showCorrect
                                            ? "border-indigo-300 bg-indigo-50"
                                            : "border-gray-200 bg-white"
                                        }`}
                                      >
                                        <span className="font-semibold mr-2">
                                          {String.fromCharCode(65 + oi)}.
                                        </span>
                                        <span>{txt}</span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>

                              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600">
                                <div className="inline-flex items-center gap-1">
                                  <Clock size={14} />{" "}
                                  {fmtDuration(r.timeSpentSeconds)}
                                </div>
                                {!isExam && (
                                  <div>Pista: {r.usedHint ? "Sí" : "No"}</div>
                                )}
                                <div>
                                  Respondida:{" "}
                                  {r.selectedIndex !== null ? "Sí" : "No"}
                                </div>
                                {!isExam && (
                                  <div>Reclamada: {claimed ? "Sí" : "No"}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Insignias */}
        {showBadges && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold">
                    Insignias de {student?.name} {student?.lastName}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBadges(false)}
                  className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
                  aria-label="Cerrar"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-auto">
                {bgs.length === 0 ? (
                  <div className="text-gray-600">
                    No tiene insignias todavía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bgs.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <img
                          src={badgeCompleted}
                          alt="Insignia de objetivo semanal"
                          className="h-12 w-12 object-contain rounded-xl shadow-sm"
                          loading="lazy"
                        />
                        <div className="leading-tight">
                          <div className="text-sm font-semibold">
                            {b.label?.trim() || "Objetivo semanal completado"}
                          </div>
                         
                          
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWithHeader>
  );
};

export default StudentDetail;
