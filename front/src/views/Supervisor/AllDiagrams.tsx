import React, { useEffect, useMemo, useState } from "react";
import PageWithHeader from "../../components/layout/PageWithHeader";
import {
  listDiagrams,
  deleteDiagram,
  type DiagramSummary,
} from "../../services/diagrams";
import { toast } from "react-toastify";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useDelayedFlag } from "../../shared/hooks/useDelayedFlag";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const PAGE_SIZE = 20;

const SupervisorTests: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DiagramSummary[]>([]);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewImg, setPreviewImg] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMore = () => setVisibleCount((v) => v + PAGE_SIZE);
  const showLoading = useDelayedFlag(loading);

  useEffect(() => {
    (async () => {
      try {
        const data = await listDiagrams();
        setItems(data);
      } catch (e: any) {
        toast.error(e.message || "Error cargando tests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((i) => normalize(i.title).includes(q));
  }, [items, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, items]);

  const onDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteDiagram(confirmId);
      setItems((prev) => prev.filter((i) => i.id !== confirmId));
      toast.success("Test eliminado");
      setConfirmId(null);
    } catch (e: any) {
      toast.error(e.message || "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Volver */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/supervisor/dashboard")}
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-2 hover:bg-gray-50"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gestionar diagramas</h1>
            <p className="text-gray-600">
              Lista de diagramas con sus preguntas asociadas.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título…"
                className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button
              onClick={() => navigate("/supervisor/diagrams/new")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Plus size={18} />
              Nuevo diagrama
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Cabecera SOLO en desktop */}
          <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            <div className="col-span-1">Imagen</div>
            <div className="col-span-6">Título</div>
            <div className="col-span-3">Preguntas</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {showLoading ? (
            <div className="p-6 text-gray-500">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-gray-500">
              No hay tests que coincidan con el filtro.
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filtered.slice(0, visibleCount).map((t) => (
                  <div key={t.id} className="px-4 py-3">
                    {/* Fila desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-1">
                        <img
                          src={t.path}
                          alt={t.title}
                          title="Haz clic para ampliar"
                          className="h-12 w-12 object-cover rounded border cursor-zoom-in"
                          onClick={() =>
                            setPreviewImg({ src: t.path, title: t.title })
                          }
                        />
                      </div>
                      <div className="col-span-6 min-w-0">
                        <div className="truncate" title={t.title}>
                          {t.title}
                        </div>
                      </div>
                      <div className="col-span-3">
                        {t.questionsCount ?? "—"}
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Link
                          to={`/supervisor/diagrams/${t.id}/stats`}
                          className="rounded-lg px-2 py-1 text-sky-700 hover:bg-sky-50"
                          title="Estudio del test"
                        >
                          <BarChart3 size={18} />
                        </Link>
                        <Link
                          to={`/supervisor/diagrams/${t.id}/edit`}
                          className="rounded-lg px-2 py-1 text-indigo-700 hover:bg-indigo-50"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </Link>
                        <button
                          onClick={() => setConfirmId(t.id)}
                          className="rounded-lg px-2 py-1 text-rose-700 hover:bg-rose-50"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Tarjeta móvil */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() =>
                            setPreviewImg({ src: t.path, title: t.title })
                          }
                          title="Ampliar imagen"
                        >
                          <img
                            src={t.path}
                            alt={t.title}
                            className="h-16 w-16 rounded border object-cover"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium break-words">
                            {t.title}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            Preguntas:{" "}
                            <span className="font-medium text-gray-700">
                              {t.questionsCount ?? "—"}
                            </span>
                          </div>

                          <div className="mt-2 flex justify-end gap-1.5">
                            <Link
                              to={`/supervisor/diagrams/${t.id}/stats`}
                              className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-50"
                              title="Estudio del test"
                              aria-label="Estudio del test"
                            >
                              <BarChart3 size={18} />
                            </Link>
                            <Link
                              to={`/supervisor/diagrams/${t.id}/edit`}
                              className="rounded-lg p-1.5 text-indigo-700 hover:bg-indigo-50"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil size={18} />
                            </Link>
                            <button
                              onClick={() => setConfirmId(t.id)}
                              className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50"
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

        {/* Modal confirmación eliminar */}
        {confirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-lg font-semibold">Eliminar test</h3>
                <button
                  onClick={() => setConfirmId(null)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5">
                <p>
                  ¿Seguro que quieres eliminar este test? Esta acción no se
                  puede deshacer.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
                <button
                  onClick={() => setConfirmId(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className={`rounded-xl px-5 py-2 text-sm font-medium text-white ${
                    deleting
                      ? "bg-rose-300 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de vista previa (zoom) */}
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

export default SupervisorTests;
