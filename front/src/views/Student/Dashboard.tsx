import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { getProfile, type UserProfile } from "../../services/users";
import {
  getRecentActivity,
  type RecentActivityItem,
} from "../../services/dashboard";
import {
  User,
  HelpCircle,
  LineChart,
  Settings,
  History,
  PlayCircle,
  CheckCircle,
  XCircle as XCircleIcon,
  MessageSquareWarning,
  MessagesSquare,
} from "lucide-react";
import { toast } from "react-toastify";


const MIN_HALF_TOGGLE = 120;

interface ExpandableTextProps {
  text?: string;
  minToHalf?: number;
  className?: string;
}


const ExpandableText: React.FC<ExpandableTextProps> = ({
  text = "",
  minToHalf = MIN_HALF_TOGGLE,
  className,
}) => {
  const needsToggle = text.length > minToHalf;
  const halfIndex = Math.ceil(text.length / 2);
  const [expanded, setExpanded] = useState(false);

  if (!needsToggle) return <div className={className}>{text || "—"}</div>;

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

interface ActionCardProps {
  title: string;
  subtitle: string;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number }>;
  accent?: "indigo" | "emerald" | "amber" | "rose";
}


const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  onClick,
  Icon,
  accent = "indigo",
}) => {
  const accents: Record<string, string> = {
    indigo: "bg-indigo-50 group-hover:bg-indigo-100",
    emerald: "bg-emerald-50 group-hover:bg-emerald-100",
    amber: "bg-amber-50 group-hover:bg-amber-100",
    rose: "bg-rose-50 group-hover:bg-rose-100",
  };
  return (
    <button
      onClick={onClick}
      className="group h-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${accents[accent]}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 w-full">
          <h3 className="text-base font-semibold break-words">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 break-words">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
        Entrar →
      </div>
    </button>
  );
};

interface ChipProps {
  className?: string;
  children: React.ReactNode;
}


const Chip: React.FC<ChipProps> = ({ className, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
      className || ""
    }`}
  >
    {children}
  </span>
);



function tQuestionStatus(s: "pending" | "approved" | "rejected") {
  return s === "approved"
    ? "Aprobada"
    : s === "rejected"
    ? "Cancelada"
    : "Pendiente";
}


function tClaimStatus(s: "PENDING" | "APPROVED" | "REJECTED") {
  return s === "APPROVED"
    ? "Aprobada"
    : s === "REJECTED"
    ? "Cancelada"
    : "Pendiente";
}


const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState<UserProfile | null>(null);

  const [recent, setRecent] = useState<RecentActivityItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 8;

  useEffect(() => {
    (async () => {
      try {
        const u = await getProfile();
        setMe(u);
      } catch {

      }
    })();
  }, []);

  const fetchMore = async (reset = false) => {
    setLoadingRecent(true);
    try {
      const items = await getRecentActivity({
        limit,
        offset: reset ? 0 : offset,
      });
      if (reset) {
        setRecent(items);
        setOffset(items.length);
        setHasMore(items.length === limit);
      } else {
        setRecent((prev) => [...prev, ...items]);
        setOffset((prev) => prev + items.length);
        setHasMore(items.length === limit);
      }
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cargar la actividad");
      if (reset) {
        setRecent([]);
        setOffset(0);
        setHasMore(false);
      }
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchMore(true);
  }, []);

  const renderItem = (it: RecentActivityItem) => {
    if (it.kind === "session") {
      const modeColors: Record<typeof it.mode, string> = {
        learning: "bg-emerald-50 text-emerald-700 border-emerald-200",
        exam: "bg-indigo-50 text-indigo-700 border-indigo-200",
        errors: "bg-rose-50 text-rose-700 border-rose-200",
      };
      return (
        <li
          key={`${it.kind}:${it.id}:${it.createdAt}`}
          className="py-3 flex items-start gap-3 min-w-0"
        >
          <Chip className={modeColors[it.mode]}>
            {it.mode === "learning"
              ? "Learning"
              : it.mode === "exam"
              ? "Examen"
              : "Errores"}
          </Chip>
          <div className="min-w-0 w-full">
            <div className="text-sm font-medium break-words whitespace-pre-wrap">
              {it.diagramTitle ?? "Diagrama"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(it.createdAt).toLocaleString()}
              {it.completedAt
                ? ` · ${it.correctCount}/${it.totalQuestions} correctas · ${
                    it.durationSec ?? 0
                  }s`
                : ""}
              {it.completedAt && typeof it.score === "number"
                ? ` · Nota: ${it.score.toFixed(1)}/10`
                : ""}
            </div>
          </div>
        </li>
      );
    }

    if (it.kind === "question") {
      const statusClass =
        it.status === "approved"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : it.status === "rejected"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-amber-50 text-amber-700 border-amber-200";
      const Icon =
        it.status === "approved"
          ? CheckCircle
          : it.status === "rejected"
          ? XCircleIcon
          : MessagesSquare;

      return (
        <li
          key={`${it.kind}:${it.id}:${it.createdAt}`}
          className="py-3 flex items-start gap-3 min-w-0"
        >
          <Chip className={statusClass}>
            <Icon size={14} /> Pregunta
          </Chip>
          <div className="min-w-0 w-full">
            <ExpandableText
              text={it.title}
              className="text-sm font-medium whitespace-pre-wrap break-words"
              minToHalf={MIN_HALF_TOGGLE}
            />
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(it.createdAt).toLocaleString()} · Estado:{" "}
              {tQuestionStatus(it.status)}
            </div>
          </div>
        </li>
      );
    }

    const statusClass =
      it.status === "APPROVED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : it.status === "REJECTED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
    const Icon =
      it.status === "APPROVED"
        ? CheckCircle
        : it.status === "REJECTED"
        ? XCircleIcon
        : MessageSquareWarning;

    return (
      <li
        key={`${it.kind}:${it.id}:${it.createdAt}`}
        className="py-3 flex items-start gap-3 min-w-0"
      >
        <Chip className={statusClass}>
          <Icon size={14} /> Reclamación
        </Chip>
        <div className="min-w-0 w-full">
          <ExpandableText
            text={it.title}
            className="text-sm font-medium whitespace-pre-wrap break-words"
            minToHalf={MIN_HALF_TOGGLE}
          />
          <div className="text-xs text-gray-500 mt-0.5">
            {new Date(it.createdAt).toLocaleString()} · Estado:{" "}
            {tClaimStatus(it.status)}
          </div>
        </div>
      </li>
    );
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
          <div className="flex flex-col gap-4 p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-100">
                <User size={18} /> Bienvenido
              </div>
              <h1 className="mt-1 text-2xl font-bold">
                {me?.name?.trim() || "Alumno"}, ¿listo para practicar?
              </h1>
              <p className="mt-1 text-indigo-100/90">
                Elige un modo de juego o revisa tu progreso.
              </p>
            </div>
            <div>
              <button
                onClick={() => navigate("/student/play-menu")}
                className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-5 py-3 font-medium text-indigo-700 shadow-sm hover:bg-white transition"
              >
                <PlayCircle size={20} />
                Jugar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            title="Configuración"
            subtitle="Edita tu información y preferencias."
            onClick={() => navigate("/student/settings")}
            Icon={Settings}
            accent="indigo"
          />
          <ActionCard
            title="Mis tests"
            subtitle="Consulta los tests que has realizado."
            onClick={() => navigate("/student/my-tests")}
            Icon={History}
            accent="amber"
          />
          <ActionCard
            title="Mis aportaciones"
            subtitle="Gestiona tus preguntas y reclamaciones."
            onClick={() => navigate("/student/questions")}
            Icon={HelpCircle}
            accent="emerald"
          />
          <ActionCard
            title="Ver progreso"
            subtitle="Evolución y métricas personales."
            onClick={() => navigate("/student/progress")}
            Icon={LineChart}
            accent="rose"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-gray-700">
            <History size={18} />
            <h3 className="text-base font-semibold">Actividad reciente</h3>
          </div>

          {loadingRecent && recent.length === 0 ? (
            <div className="text-sm text-gray-500">Cargando…</div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
              <p className="font-medium">Aún no hay actividad reciente</p>
              <p className="mt-1 text-sm text-gray-500">
                Cuando completes sesiones, crees preguntas o envíes
                reclamaciones, aparecerán aquí.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => navigate("/student/play-menu")}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  <PlayCircle size={18} /> Empezar a practicar
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto overflow-x-visible pr-2">
                {recent.map(renderItem)}
                {loadingRecent && (
                  <li className="py-3 text-sm text-gray-500 text-center">
                    Cargando…
                  </li>
                )}
              </ul>
              <div className="mt-4 flex justify-center">
                {hasMore ? (
                  <button
                    onClick={() => fetchMore(false)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    disabled={loadingRecent}
                  >
                    Cargar más
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">
                    No hay más actividad
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
   </PageWithHeader>
  );
};

export default StudentDashboard;
