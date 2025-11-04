import React, { useEffect, useMemo, useState } from "react";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { toast } from "react-toastify";
import badgeCompleted from "../../assets/completed.png";
import { useNavigate } from "react-router-dom";
import { useDelayedFlag } from "../../shared/hooks/useDelayedFlag";

import {
  getOverview,
  getTrends,
  getErrors,
  getClaimsStats,
  getMyCreatedQuestions,
  getMyWeeklyProgress,
  getMyBadges,
  type Overview,
  type TrendPoint,
  type ErrorItem,
  type ClaimsStats,
  type MyQuestionItem,
  type WeeklyProgressRow,
  type BadgeItem,
} from "../../services/progress";

import {
  Activity,
  Trophy,
  BarChart3,
  Clock,
  Gauge,
  Award,
  Target,
  CheckCircle,
  XCircle,
  MailCheck,
  ArrowLeft,
} from "lucide-react";

const fmtPct = (n?: number | null) =>
  typeof n === "number" ? `${Math.round(n)}%` : "—";

const fmtSec1 = (sec?: number | null) =>
  sec == null ? "—" : `${Math.max(0, sec).toFixed(1)} s`;

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow transition ${
      className || ""
    }`}
  >
    {children}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={`p-5 ${className || ""}`}>{children}</div>
);

interface KPIProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const KPI: React.FC<KPIProps> = ({ icon, label, value }) => (
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

const COLOR_A = "#10b981";
const COLOR_B = "#3b82f6";

interface DualLineChartProps {
  data: { a?: number | null; b?: number | null }[];
}

const DualLineChart: React.FC<DualLineChartProps> = ({ data }) => {
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
    <div>
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
              stroke={COLOR_A}
              strokeWidth={2.25}
            />
            <path
              d={makePath("b")}
              fill="none"
              stroke={COLOR_B}
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

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: COLOR_A }}
          />
          <span>Acierto (learning)</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: COLOR_B }}
          />
          <span>Nota (examen)</span>
        </div>
      </div>
    </div>
  );
};

interface ScrollableGroupedBarsProps {
  data: { label: string; ok: number; ko: number }[];
}

const ScrollableGroupedBars: React.FC<ScrollableGroupedBarsProps> = ({
  data,
}) => {
  const [hover, setHover] = React.useState<number | null>(null);

  const Pleft = 36,
    Pright = 16,
    Ptop = 16,
    Pbot = 48;
  const H = 240;
  const step = 34;
  const W = Pleft + Pright + data.length * step;

  const max = Math.max(1, ...data.map((d) => d.ok + d.ko));
  const y = (v: number) => H - Pbot - (v * (H - Ptop - Pbot)) / max;
  const barW = Math.max(6, (step - 10) / 2);

  const labelEvery = data.length <= 20 ? 1 : data.length <= 40 ? 2 : 3;

  return (
    <div className="relative overflow-x-auto pb-2">
      <svg width={W} height={H} role="img" aria-label="Preguntas por día">
        <rect x={0} y={0} width={W} height={H} fill="white" />
        {[0, 0.25, 0.5, 0.75, 1].map((g, idx) => (
          <g key={idx}>
            <line
              x1={Pleft}
              x2={W - Pright}
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
          x1={Pleft}
          x2={W - Pright}
          y1={H - Pbot}
          y2={H - Pbot}
          stroke="#9ca3af"
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const x0 = Pleft + i * step;
          const yOk = y(d.ok),
            yKo = y(d.ko);

          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <line
                  x1={x0 + step / 2}
                  x2={x0 + step / 2}
                  y1={Ptop}
                  y2={H - Pbot}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              <rect
                x={x0 + 2}
                y={yOk}
                width={barW}
                height={H - Pbot - yOk}
                fill="#10b981"
                rx={4}
              />
              <rect
                x={x0 + 2 + barW + 4}
                y={yKo}
                width={barW}
                height={H - Pbot - yKo}
                fill="#f43f5e"
                rx={4}
              />
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <g
                  transform={`translate(${x0 + step / 2}, ${
                    H - Pbot + 12
                  }) rotate(-45)`}
                >
                  <text textAnchor="end" fontSize={10} fill="#6b7280">
                    {d.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {hover != null && data[hover] && (
        <div
          className="absolute z-10 pointer-events-none rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm"
          style={{
            left: Pleft + hover * step + step / 2,
            top: 8,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-medium">{data[hover].label}</div>
          <div>✔ Aciertos: {data[hover].ok}</div>
          <div>✘ Fallos: {data[hover].ko}</div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#10b981" }}
          />
          <span>Correctas</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#f43f5e" }}
          />
          <span>Incorrectas</span>
        </div>
      </div>
    </div>
  );
};

interface DonutProps {
  value: number;
}

const Donut: React.FC<DonutProps> = ({ value }) => {
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

const MyProgress: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLoading = useDelayedFlag(loading);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [errorsTop, setErrorsTop] = useState<ErrorItem[]>([]);
  const [claims, setClaims] = useState<ClaimsStats | null>(null);
  const [myQuestions, setMyQuestions] = useState<MyQuestionItem[]>([]);

  const [prog, setProg] = useState<WeeklyProgressRow | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ov, tr, er, cl, mq, pr, bgs] = await Promise.all([
          getOverview(),
          getTrends({ bucket: "day" }),
          getErrors(5),
          getClaimsStats(),
          getMyCreatedQuestions({ limit: 200 }),
          getMyWeeklyProgress().catch(() => null),
          getMyBadges().catch(() => []),
        ]);
        setOverview(ov);
        setTrends(tr);
        setErrorsTop(er);
        setClaims(cl);
        setMyQuestions(mq);
        setProg(pr);
        setBadges(bgs || []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Error cargando progreso");
        toast.error(e?.message || "Error cargando progreso");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      const st = String((q as any).status || "").toUpperCase();
      if (st === "APPROVED") c.approved++;
      else if (st === "REJECTED") c.rejected++;
      else c.pending++;
    }
    return c;
  }, [myQuestions]);

  if (showLoading) {
    return (
      <PageWithHeader>
        <div className="mx-auto w-full max-w-6xl p-6">Cargando…</div>
      </PageWithHeader>
    );
  }
  if (error) {
    return (
      <PageWithHeader>
        <div className="mx-auto w-full max-w-6xl p-6 text-red-600">{error}</div>
      </PageWithHeader>
    );
  }

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6 space-y-8">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
              title="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Mi progreso</h1>
              <p className="text-gray-600">
                Evolución, objetivo semanal e insignias
              </p>
            </div>
          </div>
        </div>

        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI
              icon={<Activity className="h-5 w-5" />}
              label="Preguntas respondidas"
              value={overview.answeredCount}
            />
            <KPI
              icon={<Trophy className="h-5 w-5" />}
              label="Nota media (examen)"
              value={`${overview.examScoreAvg.toFixed(1)}/10`}
            />
            <KPI
              icon={<BarChart3 className="h-5 w-5" />}
              label="Acierto (learning)"
              value={fmtPct(overview.accuracyLearningPct)}
            />
            <KPI
              icon={<Clock className="h-5 w-5" />}
              label="Tiempo medio/preg."
              value={fmtSec1(overview.avgTimePerQuestionSec)}
            />
            <KPI
              icon={<Gauge className="h-5 w-5" />}
              label="Sesiones completadas"
              value={overview.sessionsCompleted}
            />

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
                      {badges.length}
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

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Objetivo semanal
              </div>

              {prog ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <span>
                      {prog.done} / {prog.target} tests
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, prog.pct))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Estado:{" "}
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 ${
                        prog.completed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {prog.completed ? "Completado" : "En progreso"}
                    </span>
                  </div>

                  {prog.completed && (
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <div className="text-lg font-semibold mb-3">Reclamaciones</div>
              {claims ? (
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
                        {claims.approved}
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
                        {claims.submitted}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Donut
                      value={
                        (claims.approved / Math.max(1, claims.submitted)) * 100
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="shrink-0 p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase text-gray-500">
                      Aprobadas
                    </div>
                    <div className="text-2xl font-semibold leading-tight">
                      {qCounts.approved}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="shrink-0 p-2.5 rounded-xl bg-rose-50 text-rose-700">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase text-gray-500">
                      Rechazadas
                    </div>
                    <div className="text-2xl font-semibold leading-tight">
                      {qCounts.rejected}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 sm:col-span-2 lg:col-span-1">
                  <Donut
                    value={
                      qCounts.approved + qCounts.rejected
                        ? (qCounts.approved /
                            (qCounts.approved + qCounts.rejected)) *
                          100
                        : 0
                    }
                  />
                  <div className="min-w-0">
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
          <div className="space-y-3">
            <div className="text-lg font-semibold">Errores frecuentes</div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {errorsTop.map((e) => (
                <Card key={e.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <XCircle className="h-4 w-4 text-rose-500" /> {e.title}
                    </div>
                    <div className="text-sm">
                      Tasa de error:{" "}
                      <span className="font-semibold">
                        {fmtPct(e.errorRatePct)}
                      </span>
                    </div>
                    {e.commonChosenText && (
                      <div className="text-xs text-gray-500">
                        Opción más elegida:{" "}
                        <span className="italic">{e.commonChosenText}</span>
                      </div>
                    )}
                    <div className="pt-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, e.errorRatePct)
                            )}%`,
                            background: "#f43f5e",
                          }}
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {showBadges && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Mis insignias</h3>
                </div>
                <button
                  onClick={() => setShowBadges(false)}
                  className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-auto">
                {badges.length === 0 ? (
                  <div className="text-gray-600">Aún no tienes insignias.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {badges.map((b) => (
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
                            {b.label?.trim() || "Insignia"}
                          </div>
                          {b.earnedAt ? (
                            <div className="text-xs text-gray-500">
                              Conseguida:{" "}
                              {new Date(b.earnedAt).toLocaleDateString()}
                            </div>
                          ) : null}
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

export default MyProgress;
