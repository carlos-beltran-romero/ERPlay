import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { getProfile, type UserProfile } from "../../services/users";
import { getPendingStudentQuestionsCount } from "../../services/review";
import {
  UserCog,
  Users,
  HelpCircle,
  ClipboardList,
  CheckSquare,
  Target,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  supGetWeeklyGoal,
  supPutWeeklyGoal,
  supGetWeeklyProgress,
  type WeeklyGoalDTO,
  type WeeklyProgressRow,
} from "../../services/supervisor";
import { toast } from "react-toastify";

const ActionCard = ({ title, subtitle, onClick, Icon, badgeCount }: any) => (
  <button
    onClick={onClick}
    className="relative group h-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
  >
    {typeof badgeCount === "number" && badgeCount > 0 && (
      <span className="absolute -top-2 -right-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
        {badgeCount > 99 ? "99+" : badgeCount}
      </span>
    )}
    <div className="flex items-start gap-4">
      <div className="rounded-xl bg-indigo-50 p-3 group-hover:bg-indigo-100 transition">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
    <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
      Entrar →
    </div>
  </button>
);

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
    <div
      className="h-full"
      style={{
        width: `${Math.max(0, Math.min(100, pct))}%`,
        background: "#22c55e",
      }}
    />
  </div>
);

const SupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState<UserProfile | null>(null);

  const [pendingCount, setPendingCount] = useState<number>(0);

  const [goal, setGoal] = useState<WeeklyGoalDTO | null>(null);
  const [targetInput, setTargetInput] = useState<number | "">("");
  const [notify, setNotify] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openProgress, setOpenProgress] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressRows, setProgressRows] = useState<WeeklyProgressRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const u = await getProfile();
        setMe(u);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const n = await getPendingStudentQuestionsCount();
      setPendingCount(n);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const g = await supGetWeeklyGoal();
        setGoal(g);
        setTargetInput(g?.targetTests ?? "");
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, []);

  const hasGoal = (goal?.targetTests ?? 0) > 0;

  async function saveGoal() {
    const v = Number(targetInput);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Introduce un objetivo (> 0)");
      return;
    }
    try {
      setSaving(true);
      const updated = await supPutWeeklyGoal({
        targetTests: Math.round(v),
        notify,
      });
      setGoal(updated);
      toast.success("Objetivo semanal guardado");
      setEditing(false);

      if (openProgress) {
        setLoadingProgress(true);
        setProgressRows(await supGetWeeklyProgress().catch(() => []));
        setLoadingProgress(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar el objetivo");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProgress() {
    if (!openProgress) {
      setOpenProgress(true);
      setLoadingProgress(true);
      try {
        const rows = await supGetWeeklyProgress();
        setProgressRows(rows);
      } catch (e: any) {
        toast.error(e?.message || "No se pudo cargar el progreso");
      } finally {
        setLoadingProgress(false);
      }
    } else {
      setOpenProgress(false);
    }
  }

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <div className="flex flex-col gap-4 p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-200">
                <UserCog size={18} /> Panel de Supervisor
              </div>
              <h1 className="mt-1 text-2xl font-bold">
                {me?.name?.trim() || "Supervisor"}
              </h1>
              <p className="mt-1 text-slate-200/90">
                Administra alumnos, objetivos semanales y revisiones.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            title="Alumnos"
            subtitle="Ver progreso y gestionar alumnos."
            onClick={() => navigate("/supervisor/users")}
            Icon={Users}
          />
          <ActionCard
            title="Alta masiva"
            subtitle="Registrar alumnos por lote."
            onClick={() => navigate("/supervisor/users/batch")}
            Icon={ClipboardList}
          />
          <ActionCard
            title="Diagramas"
            subtitle="Gestionar y estudiar diagramas."
            onClick={() => navigate("/supervisor/tests")}
            Icon={HelpCircle}
          />
          <ActionCard
            title="Revisión"
            subtitle="Valora preguntas y reclamaciones."
            onClick={() => navigate("/supervisor/questions/review")}
            Icon={CheckSquare}
            badgeCount={pendingCount}
          />
        </div>

        {/* ====== OBJETIVO SEMANAL (responsive) ====== */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Header: título + acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Target size={18} />
              <h2 className="text-lg font-semibold">
                Objetivo semanal de tests
              </h2>
            </div>

            {!editing ? (
              hasGoal ? (
                <button
                  onClick={() => {
                    setTargetInput(goal?.targetTests ?? "");
                    setEditing(true);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Modificar objetivo
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTargetInput("");
                    setEditing(true);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Definir objetivo
                </button>
              )
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditing(false);
                    setTargetInput(goal?.targetTests ?? "");
                  }}
                  disabled={saving}
                  className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveGoal}
                  disabled={
                    saving ||
                    !editing ||
                    targetInput === "" ||
                    Number(targetInput) <= 0 ||
                    Number(targetInput) === (goal?.targetTests ?? 0)
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar objetivo
                </button>
              </div>
            )}
          </div>

          {/* Periodo */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays size={16} />
              <span>
                Período:{" "}
                {goal?.weekStart && goal?.weekEnd ? (
                  <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                    {goal.weekStart} — {goal.weekEnd}
                  </span>
                ) : (
                  "Semana actual"
                )}
              </span>
            </div>
          </div>

          {/* Formulario (1 col en móvil, 3-4 en desktop) */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-gray-500">
                Tests objetivo (semana)
              </label>
              <input
                type="number"
                min={1}
                value={targetInput}
                disabled={!editing || saving}
                onChange={(e) =>
                  setTargetInput(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                placeholder="p.ej. 12"
              />
              <div className="mt-1 text-xs text-gray-500">
                Actual: <strong>{hasGoal ? goal?.targetTests : "—"}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2 md:col-span-1">
              <input
                id="notify"
                type="checkbox"
                checked={notify}
                disabled={!editing || saving}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <label htmlFor="notify" className="text-sm text-gray-700">
                Enviar email a los alumnos
              </label>
            </div>
          </div>

          {/* Botón ver progreso */}
          <div className="mt-6">
            <button
              onClick={toggleProgress}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              disabled={!hasGoal}
              title={
                !hasGoal
                  ? "Define un objetivo para ver el progreso"
                  : "Ver progreso por alumno"
              }
            >
              {openProgress ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              {openProgress
                ? "Ocultar progreso por alumno"
                : "Ver progreso por alumno"}
            </button>
          </div>

          {/* PROGRESO POR ALUMNO */}
          {openProgress && (
            <div className="mt-5">
              {/* Desktop / tablets grandes: tabla */}
              <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <div className="col-span-4">Alumno</div>
                  <div className="col-span-3">Progreso</div>
                  <div className="col-span-3 text-sm">Hecho / Objetivo</div>
                  <div className="col-span-2 text-right pr-2">Estado</div>
                </div>

                {loadingProgress ? (
                  <div className="p-6 text-gray-600 inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                  </div>
                ) : progressRows.length === 0 ? (
                  <div className="p-6 text-gray-500">
                    No hay alumnos o no hay objetivo activo.
                  </div>
                ) : (
                  <div className="divide-y">
                    {progressRows.map((r) => (
                      <div
                        key={r.userId}
                        className="grid grid-cols-12 gap-3 px-4 py-3 items-center"
                      >
                        <div className="col-span-4 min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.email}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <ProgressBar pct={r.pct} />
                        </div>
                        <div className="col-span-3 text-sm">
                          {r.done} / {r.target}
                        </div>
                        <div className="col-span-2 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                              r.completed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.completed ? "Completado" : "En progreso"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Móvil: tarjetas apiladas */}
              <div className="md:hidden">
                {loadingProgress ? (
                  <div className="p-4 text-gray-600 inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                  </div>
                ) : progressRows.length === 0 ? (
                  <div className="p-4 text-gray-500">
                    No hay alumnos o no hay objetivo activo.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {progressRows.map((r) => (
                      <div
                        key={r.userId}
                        className="rounded-xl border border-gray-200 p-4 bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium break-words">
                              {r.name}
                            </div>
                            <div className="text-xs text-gray-500 break-words">
                              {r.email}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                              r.completed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {r.completed ? "Completado" : "En progreso"}
                          </span>
                        </div>

                        <div className="mt-3">
                          <ProgressBar pct={r.pct} />
                          <div className="mt-1 text-xs text-gray-600">
                            {r.done} / {r.target} tests
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWithHeader>
  );
};

export default SupervisorDashboard;
