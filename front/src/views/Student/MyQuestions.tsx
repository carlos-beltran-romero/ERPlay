// src/views/Student/MyQuestionsView.tsx
import React, { useEffect, useMemo, useState } from "react";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { toast } from "react-toastify";
import { listMyQuestions } from "../../services/questions";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MessageSquare,
  Filter,
  Flag,
  ArrowLeft,
} from "lucide-react";

/* ---------- Tipos ---------- */
type MyQuestion = {
  id: string;
  prompt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewComment?: string | null;
  diagram?: { id: string; title: string; path?: string };
  createdAt?: string;
  reviewedAt?: string | null;
  options?: string[];
  correctIndex?: number;
};

type MyClaim = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerComment?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  question?: { id: string; prompt: string };
  diagram?: { id: string; title: string; path?: string };
  chosenIndex?: number;
  correctIndex?: number;
  options?: string[];
};

/* ---------- Constantes ---------- */
const PAGE_SIZE = 15; // ítems por “página” en cada pestaña
const MIN_HALF_TOGGLE = 120; // umbral “cortar por la mitad” en enunciados
const MIN_HALF_TOGGLE_OPT = 80; // umbral “cortar por la mitad” en opciones

/* ---------- Utilidades ---------- */
const STATUS_LABEL = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
} as const;

const letter = (i?: number) =>
  typeof i === "number" && i >= 0 ? String.fromCharCode(65 + i) : "—";

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : "";

/* Texto expandible: si es largo, muestra la mitad y “Ver más / Ver menos” */
const ExpandableText: React.FC<{
  text: string;
  minToHalf?: number;
  className?: string;
}> = ({ text, minToHalf = MIN_HALF_TOGGLE, className }) => {
  const needsToggle = (text || "").length > minToHalf;
  const halfIndex = Math.ceil((text || "").length / 2);
  const [expanded, setExpanded] = useState(false);

  if (!needsToggle) return <div className={className}>{text}</div>;

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap break-words">
        {expanded ? text : text.slice(0, halfIndex)}
        {!expanded && "…"}
      </span>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="ml-2 inline-flex items-center text-indigo-600 hover:text-indigo-700 text-xs font-medium"
      >
        {expanded ? "Ver menos" : "Ver más"}
      </button>
    </div>
  );
};

const StatusBadge: React.FC<{
  status: MyQuestion["status"] | MyClaim["status"];
}> = ({ status }) => {
  const common =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  if (status === "PENDING") {
    return (
      <span
        className={`${common} bg-amber-50 text-amber-700 border border-amber-200`}
      >
        <Clock size={12} /> {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span
        className={`${common} bg-emerald-50 text-emerald-700 border border-emerald-200`}
      >
        <CheckCircle2 size={12} /> {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <span
      className={`${common} bg-rose-50 text-rose-700 border border-rose-200`}
    >
      <X size={12} /> {STATUS_LABEL[status]}
    </span>
  );
};

/* ---------- Vista principal ---------- */
const MyQuestionsView: React.FC = () => {
  const navigate = useNavigate();

  // Tabs
  const [tab, setTab] = useState<"questions" | "claims">("questions");

  // Estado común
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<{
    src: string;
    title: string;
  } | null>(null);

  // Preguntas del alumno
  const [items, setItems] = useState<MyQuestion[]>([]);
  const [queryQ, setQueryQ] = useState("");
  const [statusFilterQ, setStatusFilterQ] = useState<
    "ALL" | MyQuestion["status"]
  >("ALL");
  const [visibleQ, setVisibleQ] = useState(PAGE_SIZE);

  // Reclamaciones del alumno
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [queryC, setQueryC] = useState("");
  const [statusFilterC, setStatusFilterC] = useState<"ALL" | MyClaim["status"]>(
    "ALL"
  );
  const [visibleC, setVisibleC] = useState(PAGE_SIZE);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) Tus preguntas creadas
        const rows = await listMyQuestions();
        setItems(rows);

        // 2) Tus reclamaciones
        const { listMyClaims } = await import("../../services/claims");
        const myClaims = await listMyClaims().catch(() => []);
        setClaims(myClaims as MyClaim[]);
      } catch (e: any) {
        toast.error(e.message || "No se pudieron cargar tus datos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtrado preguntas
  const filteredQ = useMemo(() => {
    const q = queryQ.trim().toLowerCase();
    return items.filter((item) => {
      const okStatus =
        statusFilterQ === "ALL" ? true : item.status === statusFilterQ;
      const inText =
        !q ||
        item.prompt?.toLowerCase().includes(q) ||
        item.diagram?.title?.toLowerCase().includes(q);
      return okStatus && inText;
    });
  }, [items, queryQ, statusFilterQ]);

  // Filtrado reclamaciones
  const filteredC = useMemo(() => {
    const q = queryC.trim().toLowerCase();
    return claims.filter((c) => {
      const okStatus =
        statusFilterC === "ALL" ? true : c.status === statusFilterC;
      const inText =
        !q ||
        c.question?.prompt?.toLowerCase().includes(q) ||
        c.diagram?.title?.toLowerCase().includes(q);
      return okStatus && inText;
    });
  }, [claims, queryC, statusFilterC]);

  // Reset paginación al cambiar filtros/búsquedas
  useEffect(() => {
    setVisibleQ(PAGE_SIZE);
  }, [queryQ, statusFilterQ, items]);

  useEffect(() => {
    setVisibleC(PAGE_SIZE);
  }, [queryC, statusFilterC, claims]);

  /* ----------- Render ----------- */
  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Header con back + Tabs */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("student/dashboard")}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
              title="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Mis aportaciones</h1>
              <p className="text-gray-600">
                Consulta tus preguntas creadas y el estado de tus reclamaciones.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <button
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              tab === "questions"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            }`}
            onClick={() => setTab("questions")}
          >
            Mis preguntas
          </button>
          <button
            className={`rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 ${
              tab === "claims"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            }`}
            onClick={() => setTab("claims")}
          >
            <Flag size={14} /> Mis reclamaciones
          </button>
        </div>

        {/* ===== TAB: PREGUNTAS ===== */}
        {tab === "questions" && (
          <>
            {/* Filtros + CTA */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={queryQ}
                    onChange={(e) => setQueryQ(e.target.value)}
                    placeholder="Buscar por enunciado o diagrama…"
                    className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={statusFilterQ}
                    onChange={(e) => setStatusFilterQ(e.target.value as any)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="ALL">Todos</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="APPROVED">Aprobada</option>
                    <option value="REJECTED">Rechazada</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  onClick={() => navigate("/student/questions/new")}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <Plus size={18} />
                  Nueva pregunta
                </button>
              </div>
            </div>

            {/* Listado preguntas */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* Cabecera solo desktop */}
              <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <div className="col-span-1">Diagrama</div>
                <div className="col-span-6">Enunciado</div>
                <div className="col-span-2">Estado</div>
                <div className="col-span-3">Resolución</div>
              </div>

              {loading ? (
                <div className="p-6 text-gray-500">Cargando…</div>
              ) : filteredQ.length === 0 ? (
                <div className="p-6 text-gray-500">
                  No hay preguntas que coincidan con el filtro.
                </div>
              ) : (
                <>
                  <div className="divide-y">
                    {filteredQ.slice(0, visibleQ).map((q) => (
                      <div key={q.id} className="px-4 py-3">
                        {/* Desktop (tabla) */}
                        <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                          {/* Diagrama */}
                          <div className="col-span-1">
                            {q.diagram?.path ? (
                              <img
                                src={q.diagram.path}
                                alt={q.diagram.title || "Diagrama"}
                                title="Haz clic para ampliar"
                                className="h-12 w-12 object-cover rounded border cursor-zoom-in"
                                onClick={() =>
                                  setPreviewImg({
                                    src: q.diagram!.path!,
                                    title: q.diagram?.title || "Diagrama",
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
                          <div className="col-span-6 min-w-0">
                            <ExpandableText
                              text={q.prompt || ""}
                              className="font-medium"
                              minToHalf={MIN_HALF_TOGGLE}
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              {q.diagram?.title?.trim() || "—"}
                              {q.createdAt ? (
                                <> · Creada el {fmtDate(q.createdAt)}</>
                              ) : null}
                            </div>

                            {/* Opciones (con bordes suaves) */}
                            {Array.isArray(q.options) &&
                              q.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, idx) => {
                                    const isSelected =
                                      idx === (q.correctIndex ?? -1);
                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded-lg border px-3 py-2 text-sm ${
                                          isSelected
                                            ? "border-gray-200 bg-gray-50"
                                            : "border-gray-100 bg-white"
                                        }`}
                                      >
                                        <span className="font-semibold mr-2">
                                          {String.fromCharCode(65 + idx)}.
                                        </span>
                                        <ExpandableText
                                          text={opt}
                                          minToHalf={MIN_HALF_TOGGLE_OPT}
                                          className="inline"
                                        />
                                        {isSelected && (
                                          <span className="ml-2 inline-flex items-center text-gray-600">
                                            <CheckCircle2
                                              size={14}
                                              className="mr-1"
                                            />
                                            Seleccionada
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>

                          {/* Estado */}
                          <div className="col-span-2">
                            <StatusBadge status={q.status} />
                          </div>

                          {/* Resolución (bordes suaves) */}
                          <div className="col-span-3">
                            {q.status === "REJECTED" &&
                            q.reviewComment?.trim() ? (
                              <div className="inline-flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                <MessageSquare size={14} className="mt-0.5" />
                                <span className="whitespace-pre-wrap break-words">
                                  {q.reviewComment}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Mobile (tarjeta) */}
                        <div className="md:hidden">
                          {/* Imagen grande arriba (16:9) */}
                          <div className="mb-3 rounded-xl border bg-white overflow-hidden">
                            <div className="relative w-full pt-[56.25%]">
                              {" "}
                              {/* 16:9 = 9/16 * 100 */}
                              {q.diagram?.path ? (
                                <img
                                  src={q.diagram.path}
                                  alt={q.diagram.title || "Diagrama"}
                                  title="Toca para ampliar"
                                  className="absolute inset-0 h-full w-full object-contain bg-white"
                                  onClick={() =>
                                    setPreviewImg({
                                      src: q.diagram!.path!,
                                      title: q.diagram?.title || "Diagrama",
                                    })
                                  }
                                />
                              ) : (
                                <div className="absolute inset-0 grid place-items-center text-gray-400">
                                  <ImageIcon size={18} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enunciado y meta */}
                          <ExpandableText
                            text={q.prompt || ""}
                            className="font-medium"
                            minToHalf={MIN_HALF_TOGGLE}
                          />
                          <div className="mt-1 text-xs text-gray-500">
                            {q.diagram?.title?.trim() || "—"}
                            {q.createdAt ? (
                              <> · Creada el {fmtDate(q.createdAt)}</>
                            ) : null}
                          </div>

                          {/* Opciones (apiladas) */}
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, idx) => {
                                const isSelected =
                                  idx === (q.correctIndex ?? -1);
                                return (
                                  <div
                                    key={idx}
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                      isSelected
                                        ? "border-gray-200 bg-gray-50"
                                        : "border-gray-100 bg-white"
                                    }`}
                                  >
                                    <span className="font-semibold mr-2">
                                      {String.fromCharCode(65 + idx)}.
                                    </span>
                                    <ExpandableText
                                      text={opt}
                                      minToHalf={MIN_HALF_TOGGLE_OPT}
                                      className="inline"
                                    />
                                    {isSelected && (
                                      <span className="ml-2 inline-flex items-center text-gray-600">
                                        <CheckCircle2
                                          size={14}
                                          className="mr-1"
                                        />
                                        Seleccionada
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Estado + Resolución en línea */}
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <StatusBadge status={q.status} />
                            {q.status === "REJECTED" &&
                            q.reviewComment?.trim() ? (
                              <div className="inline-flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                <MessageSquare size={14} className="mt-0.5" />
                                <span className="whitespace-pre-wrap break-words">
                                  {q.reviewComment}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer paginación preguntas */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-gray-500">
                      Mostrando {Math.min(visibleQ, filteredQ.length)} de{" "}
                      {filteredQ.length}
                    </span>
                    {visibleQ < filteredQ.length && (
                      <button
                        onClick={() => setVisibleQ((v) => v + PAGE_SIZE)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Cargar más
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ===== TAB: RECLAMACIONES ===== */}
        {tab === "claims" && (
          <>
            {/* Filtros (reclamaciones) */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={queryC}
                    onChange={(e) => setQueryC(e.target.value)}
                    placeholder="Buscar por enunciado o diagrama…"
                    className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={statusFilterC}
                    onChange={(e) => setStatusFilterC(e.target.value as any)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="ALL">Todos</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="APPROVED">Aprobada</option>
                    <option value="REJECTED">Rechazada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Listado reclamaciones */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* Cabecera solo desktop */}
              <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <div className="col-span-1">Diagrama</div>
                <div className="col-span-5">Enunciado</div>
                <div className="col-span-3">Tu resp. / Test</div>
                <div className="col-span-1 text-center">Estado</div>
                <div className="col-span-2">Resolución</div>
              </div>

              {loading ? (
                <div className="p-6 text-gray-500">Cargando…</div>
              ) : filteredC.length === 0 ? (
                <div className="p-6 text-gray-500">
                  No hay reclamaciones que coincidan con el filtro.
                </div>
              ) : (
                <>
                  <div className="divide-y">
                    {filteredC.slice(0, visibleC).map((c) => {
                      const chosenTxt =
                        typeof c.chosenIndex === "number" &&
                        c.options?.[c.chosenIndex]
                          ? `${letter(c.chosenIndex)}. ${
                              c.options[c.chosenIndex]
                            }`
                          : "—";
                      const correctTxt =
                        typeof c.correctIndex === "number" &&
                        c.options?.[c.correctIndex]
                          ? `${letter(c.correctIndex)}. ${
                              c.options[c.correctIndex]
                            }`
                          : "—";

                      return (
                        <div key={c.id} className="px-4 py-3">
                          {/* Desktop (tabla) */}
                          <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                            {/* Diagrama */}
                            <div className="col-span-1">
                              {c.diagram?.path ? (
                                <img
                                  src={c.diagram.path}
                                  alt={c.diagram.title || "Diagrama"}
                                  title="Haz clic para ampliar"
                                  className="h-12 w-12 object-cover rounded border cursor-zoom-in"
                                  onClick={() =>
                                    setPreviewImg({
                                      src: c.diagram!.path!,
                                      title: c.diagram?.title || "Diagrama",
                                    })
                                  }
                                />
                              ) : (
                                <div className="h-12 w-12 grid place-items-center rounded border text-gray-400">
                                  <ImageIcon size={16} />
                                </div>
                              )}
                            </div>

                            {/* Enunciado + diagrama */}
                            <div className="col-span-5 min-w-0">
                              <ExpandableText
                                text={c.question?.prompt || "—"}
                                className="font-medium"
                                minToHalf={MIN_HALF_TOGGLE}
                              />
                              <div className="mt-1 text-xs text-gray-500">
                                {c.diagram?.title?.trim() || "—"}
                                {c.createdAt ? (
                                  <> · Enviada el {fmtDate(c.createdAt)}</>
                                ) : null}
                              </div>
                            </div>

                            {/* Comparativa */}
                            <div className="col-span-3">
                              <div className="text-xs text-gray-500">
                                Tu respuesta
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-sm">
                                <ExpandableText
                                  text={chosenTxt}
                                  minToHalf={MIN_HALF_TOGGLE_OPT}
                                  className="whitespace-pre-wrap break-words"
                                />
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Respuesta del test
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-sm">
                                <ExpandableText
                                  text={correctTxt}
                                  minToHalf={MIN_HALF_TOGGLE_OPT}
                                  className="whitespace-pre-wrap break-words"
                                />
                              </div>
                            </div>

                            {/* Estado */}
                            <div className="col-span-1 flex items-center justify-center">
                              <StatusBadge status={c.status} />
                            </div>

                            {/* Resolución */}
                            <div className="col-span-2 pl-6 md:pl-8">
                              {c.status === "REJECTED" &&
                              c.reviewerComment?.trim() ? (
                                <div className="inline-flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                  <MessageSquare size={14} className="mt-0.5" />
                                  <span className="whitespace-pre-wrap break-words">
                                    {c.reviewerComment}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Mobile (tarjeta) */}
                          <div className="md:hidden">
                            {/* Imagen grande arriba */}
                            <div className="mb-2">
                              {c.diagram?.path ? (
                                <img
                                  src={c.diagram.path}
                                  alt={c.diagram.title || "Diagrama"}
                                  title="Toca para ampliar"
                                  className="w-full max-h-64 object-contain rounded-xl border bg-white"
                                  onClick={() =>
                                    setPreviewImg({
                                      src: c.diagram!.path!,
                                      title: c.diagram?.title || "Diagrama",
                                    })
                                  }
                                />
                              ) : (
                                <div className="w-full h-40 grid place-items-center rounded-xl border text-gray-400 bg-white">
                                  <ImageIcon size={18} />
                                </div>
                              )}
                            </div>

                            {/* Enunciado y meta */}
                            <ExpandableText
                              text={c.question?.prompt || "—"}
                              className="font-medium"
                              minToHalf={MIN_HALF_TOGGLE}
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              {c.diagram?.title?.trim() || "—"}
                              {c.createdAt ? (
                                <> · Enviada el {fmtDate(c.createdAt)}</>
                              ) : null}
                            </div>

                            {/* Comparativa apilada */}
                            <div className="mt-2 space-y-2">
                              <div>
                                <div className="text-[11px] text-gray-500">
                                  Tu respuesta
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-sm">
                                  <ExpandableText
                                    text={
                                      typeof c.chosenIndex === "number" &&
                                      c.options?.[c.chosenIndex]
                                        ? `${String.fromCharCode(
                                            65 + c.chosenIndex
                                          )}. ${c.options[c.chosenIndex]}`
                                        : "—"
                                    }
                                    minToHalf={MIN_HALF_TOGGLE_OPT}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-gray-500">
                                  Respuesta del test
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-sm">
                                  <ExpandableText
                                    text={
                                      typeof c.correctIndex === "number" &&
                                      c.options?.[c.correctIndex]
                                        ? `${String.fromCharCode(
                                            65 + c.correctIndex
                                          )}. ${c.options[c.correctIndex]}`
                                        : "—"
                                    }
                                    minToHalf={MIN_HALF_TOGGLE_OPT}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Estado + Resolución */}
                            <div className="mt-2 flex items-start justify-between gap-3">
                              <StatusBadge status={c.status} />
                              {c.status === "REJECTED" &&
                              c.reviewerComment?.trim() ? (
                                <div className="inline-flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                  <MessageSquare size={14} className="mt-0.5" />
                                  <span className="whitespace-pre-wrap break-words">
                                    {c.reviewerComment}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer paginación reclamaciones */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-gray-500">
                      Mostrando {Math.min(visibleC, filteredC.length)} de{" "}
                      {filteredC.length}
                    </span>
                    {visibleC < filteredC.length && (
                      <button
                        onClick={() => setVisibleC((v) => v + PAGE_SIZE)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Cargar más
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
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
                <X size={18} />
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
      </div>
   </PageWithHeader>
  );
};

export default MyQuestionsView;
