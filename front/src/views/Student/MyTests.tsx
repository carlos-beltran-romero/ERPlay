
import React, { useEffect, useMemo, useState } from "react";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDelayedFlag } from "../../shared/hooks/useDelayedFlag";
import {
  listMySessions,
  getSessionDetail,
  type SessionSummary,
  type SessionDetail,
} from "../../services/tests";
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  X as CloseIcon,
  Eye,
  Flag,
  ArrowLeft,
} from "lucide-react";
import { formatDateTime, formatDate, formatDuration } from "../../shared/utils/datetime";
import { resolveAssetUrl } from "../../shared/utils/url";

const modeLabel: Record<"learning" | "exam", string> = {
  learning: "Aprendizaje",
  exam: "Examen",
};
type ModeFilter = "ALL" | "learning" | "exam";


const PAGE_SIZE = 20;

const MyTests: React.FC = () => {
  const navigate = useNavigate();

  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(""); 
  const [dateTo, setDateTo] = useState<string>(""); 
  const [refreshing, setRefreshing] = useState(false);

  
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const showLoading = useDelayedFlag(loading);
  const showDetailLoading = useDelayedFlag(detailLoading);

  
  const loadList = async () => {
    setLoading(true);
    try {
      const params: {
        mode?: "learning" | "exam";
        dateFrom?: string;
        dateTo?: string;
        q?: string;
      } = {};
      if (mode !== "ALL") params.mode = mode;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (q.trim()) params.q = q.trim();

      const rows = await listMySessions(params);
      setItems(rows);
    } catch (e: any) {
      toast.error(e.message || "No se pudo cargar tus tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    
  }, []);

  
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((it) => {
      if (it.mode === "errors") return false;
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
  }, [items, mode, q, dateFrom, dateTo]);

  
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mode, q, dateFrom, dateTo, items]);

  const applyQuickRange = (days: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - (days - 1));
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(now.toISOString().slice(0, 10));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadList();
      setVisibleCount(PAGE_SIZE);
      if (detailOpen && selectedId) {
        await openDetail(selectedId, true);
      }
    } finally {
      setRefreshing(false);
    }
  };

  
  const openDetail = async (id: string, keepOpen = false) => {
    setSelectedId(id);
    if (!keepOpen) setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await getSessionDetail(id);
      setDetail(d);
    } catch (e: any) {
      toast.error(e.message || "No se pudo cargar el detalle del test");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedId(null);
    setDetail(null);
  };

  
  const claimCount = useMemo(() => {
    if (!detail?.results) return 0;
    return detail.results.filter((r: any) => !!(r.claimed || r.claimId)).length;
  }, [detail]);

  const isClaimed = (r: any) => !!(r?.claimed || r?.claimId);

  
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
    if (total > 0) return Math.round((correct / total) * 100) / 10;
    return null;
  }, [detail]);

  
  const loadMore = () => setVisibleCount((v) => v + PAGE_SIZE);

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Header con back */}
        <div className="mb-4 flex items-start justify-between">
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
              <h1 className="text-2xl font-semibold">Mis tests</h1>
              <p className="text-gray-600">
                Consulta todos tus tests realizados. Filtra por modo y fechas y
                abre el detalle para ver cada pregunta.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por diagrama/nota…"
                className="w-64 rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Mode pills */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Modo:</span>
              {(["ALL", "learning", "exam"] as ModeFilter[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1.5 text-sm border ${
                    mode === m
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                      : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  {m === "ALL" ? "Todos" : modeLabel[m]}
                </button>
              ))}
            </div>

            {/* Dates (responsive) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Fila 1: icono + fechas */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 sm:w-40 rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                />
                <span className="text-gray-500 text-sm hidden sm:inline">
                  —
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 sm:w-40 rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                />

                {/* ≥ sm: botones en la misma fila */}
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  <button
                    onClick={() => applyQuickRange(7)}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Últimos 7d
                  </button>
                  <button
                    onClick={() => applyQuickRange(30)}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Últimos 30d
                  </button>
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* < sm: botones en segunda fila con scroll horizontal */}
              <div className="sm:hidden -mx-1 overflow-x-auto whitespace-nowrap">
                <div className="px-1 flex gap-2">
                  <button
                    onClick={() => applyQuickRange(7)}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Últimos 7d
                  </button>
                  <button
                    onClick={() => applyQuickRange(30)}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Últimos 30d
                  </button>
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Actualizar
            </button>
          </div>
        </div>

        {/* LIST responsive */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Cabecera SOLO en desktop */}
          <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            <div className="col-span-5">Diagrama</div>
            <div className="col-span-2">Modo</div>
            <div className="col-span-2">Preguntas</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-1 text-right">Ver</div>
          </div>

          {showLoading ? (
            <div className="p-6 text-gray-600">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-gray-500">
              No hay tests que coincidan con el filtro.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filtered.slice(0, visibleCount).map((it) => {
                  const acc =
                    it.mode === "exam"
                      ? typeof it.summary?.score === "number"
                        ? `Nota: ${it.summary.score}`
                        : "Nota: —"
                      : typeof it.summary?.accuracyPct === "number"
                      ? `Acierto: ${it.summary.accuracyPct}%`
                      : "Acierto: —";

                  const modeTxt =
                    it.mode === "exam"
                      ? modeLabel.exam
                      : it.mode === "learning"
                      ? modeLabel.learning
                      : "—";

                  return (
                    <div key={it.id} className="px-4 py-3 hover:bg-gray-50">
                      {/* Desktop layout */}
                      <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-5 min-w-0">
                          <div className="font-medium truncate">
                            {it.diagram?.title || "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {acc} · {formatDuration(it.summary?.durationSeconds)}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <span className="text-sm">{modeTxt}</span>
                        </div>

                        <div className="col-span-2 text-sm">
                          {it.questionCount ?? 0}
                        </div>

                        <div className="col-span-2">
                          <div className="text-sm">
                            {formatDateTime(it.startedAt)}
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => openDetail(it.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                            Ver
                          </button>
                        </div>
                      </div>

                      {/* Mobile card layout */}
                      <div className="md:hidden">
                        <div className="min-w-0">
                          <div className="font-medium break-words">
                            {it.diagram?.title || "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {acc} · {formatDuration(it.summary?.durationSeconds)}
                          </div>
                        </div>

                        {/* Meta en 3 columnas para que NO se junten */}
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl border border-gray-100  px-2.5 py-1.5 shadow-sm">
                            <div className="text-[10px] text-gray-500">
                              Modo
                            </div>
                            <div className="font-medium">{modeTxt}</div>
                          </div>
                          <div className="rounded-xl border border-gray-100  px-2.5 py-1.5 shadow-sm">
                            <div className="text-[10px] text-gray-500">
                              Preguntas
                            </div>
                            <div className="font-medium">
                              {it.questionCount ?? 0}
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-100  px-2.5 py-1.5 shadow-sm min-w-0">
                            <div className="text-[10px] text-gray-500">
                              Fecha
                            </div>
                            <div className="font-medium break-words">
                              {formatDateTime(it.startedAt)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => openDetail(it.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer paginado */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">
                  Mostrando {Math.min(visibleCount, filtered.length)} de{" "}
                  {filtered.length}
                </span>
                {visibleCount < filtered.length && (
                  <button
                    onClick={loadMore}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cargar más
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ====== DETAIL MODAL (overlay) ====== */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <div className="text-xs text-gray-500">Diagrama</div>
                <h2 className="text-lg font-semibold">
                  {detail?.diagram?.title || "—"}
                </h2>
                <div className="mt-1 text-xs text-gray-500">
                  {detail
                    ? `${
                        detail.mode === "exam"
                          ? modeLabel.exam
                          : detail.mode === "learning"
                          ? modeLabel.learning
                          : "—"
                      } · ${formatDateTime(detail.startedAt)}${
                        detail.finishedAt
                          ? ` · ${formatDateTime(detail.finishedAt)}`
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

            {/* Modal body */}
            <div className="p-5 max-h-[80vh] overflow-auto">
              {showDetailLoading ? (
                <div className="text-gray-600">Cargando detalle…</div>
              ) : !detail ? (
                <div className="text-gray-500">
                  No se pudo cargar el detalle.
                </div>
              ) : (
                <>
                  {/* KPIs */}
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
                        {formatDuration(
                          detail.durationSeconds ??
                            detail.summary?.durationSeconds
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
                              const pctFromSummary =
                                typeof detail.summary?.accuracyPct === "number"
                                  ? detail.summary.accuracyPct
                                  : null;
                              const pctFromTotals = detail.totals
                                ?.totalQuestions
                                ? Math.round(
                                    (100 * (detail.totals.correct ?? 0)) /
                                      (detail.totals.totalQuestions || 1)
                                  )
                                : null;
                              const pct = pctFromSummary ?? pctFromTotals;
                              return typeof pct === "number" ? `${pct}%` : "—";
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
                        {formatDate(detail.startedAt)}
                      </div>
                    </div>

                    {/* Solo mostrar “Reclamaciones” si NO es examen */}
                    {detail.mode !== "exam" && (
                      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                        <div className="text-xs text-gray-500">
                          Reclamaciones
                        </div>
                        <div className="text-base font-semibold">
                          {claimCount}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Diagram image */}
                  <div className="mt-4">
                    {detail.diagram?.path ? (
                      <img
                        src={resolveAssetUrl(detail.diagram.path) || undefined}
                        alt={detail.diagram.title || "Diagrama"}
                        className="max-h-[24rem] w-full rounded-lg border object-contain"
                      />
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  <div className="mt-6">
                    <div className="mb-3 text-sm text-gray-600">Preguntas</div>
                    <div className="space-y-3">
                      {(detail.results ?? []).map((r: any, idx: number) => {
                        const answered = typeof r.selectedIndex === "number";
                        const isExam = detail.mode === "exam";

                        
                        const showCorrect =
                          !isExam && typeof r.correctIndex === "number";
                        const isCorrect =
                          answered &&
                          showCorrect &&
                          r.selectedIndex === r.correctIndex;
                        const claimed = !isExam && isClaimed(r);

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
                              <div className="text-sm font-medium">
                                {idx + 1}. {r.prompt}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {!isExam && claimed && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                                    <Flag size={12} />
                                    Reclamada
                                  </span>
                                )}
                                {answered ? (
                                  showCorrect ? (
                                    isCorrect ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={12} />
                                        Correcta
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                                        <XCircle size={12} />
                                        Incorrecta
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

                            {/* options */}
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
                                        {String.fromCodePoint(65 + oi)}.
                                      </span>
                                      <span>{txt}</span>
                                    </div>
                                  );
                                }
                              )}
                            </div>

                            {/* meta */}
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600">
                              <div className="inline-flex items-center gap-1">
                                <Clock size={14} />{" "}
                                {formatDuration(r.timeSpentSeconds)}
                              </div>
                              {!isExam && (
                                <div>Pista: {r.usedHint ? "Sí" : "No"}</div>
                              )}
                              <div>
                                Respondida:{" "}
                                {r.selectedIndex !== null ? "Sí" : "No"}
                              </div>
                              {!isExam && (
                                <div>
                                  Reclamada: {isClaimed(r) ? "Sí" : "No"}
                                </div>
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
   </PageWithHeader>
  );
};

export default MyTests;
