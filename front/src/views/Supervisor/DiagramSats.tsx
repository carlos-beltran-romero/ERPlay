
import React, { useEffect, useState } from 'react';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { useNavigate, useParams } from 'react-router-dom';
import { getDiagram } from '../../services/diagrams';
import { getDiagramStats, type DiagramStatsResponse } from '../../services/diagramStats';
import { toast } from 'react-toastify';
import {
  ArrowLeft, Activity, Trophy, AlertTriangle,
  Lightbulb, Target, Sigma, BarChart3, TrendingUp, TrendingDown, Info
} from 'lucide-react';
import { useDelayedFlag } from '../../shared/hooks/useDelayedFlag';

/* ---------- Tipos opcionales (el back puede rellenarlos) ---------- */
type ItemQuality = {
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
type DistractorBreakdown = {
  questionId: string;
  optionText: string;
  chosenPct: number;            
  chosenPctLowQuartile?: number;
  chosenPctHighQuartile?: number;
};
type LearningCurves = {
  attemptsToMasteryP50: number | null;   
  deltaPracticeToExamAvgPts: number;     
};
type Reliability = { kr20: number | null }; 
type DriftItem = {
  questionId: string;
  title?: string;
  deltaPCorrectPct: number;              
  deltaMedianTimeSec: number | null;     
};
type ExtendedStats = DiagramStatsResponse & {
  itemQuality?: ItemQuality[];
  distractors?: DistractorBreakdown[];
  learningCurves?: LearningCurves;
  reliability?: Reliability;
  drift?: DriftItem[];
};

/* ---------- UI shells ---------- */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className || ''}`}>{children}</div>
);
const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`p-5 ${className || ''}`}>{children}</div>
);
const KPI: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }> = ({ icon, label, value, hint }) => (
  <Card>
    <CardBody className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-gray-50 text-gray-700">{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-xl font-semibold leading-tight">{value}</span>
        {hint ? <span className="text-[11px] text-gray-500 mt-0.5">{hint}</span> : null}
      </div>
    </CardBody>
  </Card>
);

/* ---------- Helpers ---------- */
const pct = (n?: number) => `${Math.round(Math.max(0, Math.min(100, Number(n ?? 0))))}%`;
const fmt10 = (n?: number) => (Number.isFinite(n) ? (Number(n).toFixed(1)) : '—');
const fmtSec1 = (n?: number) => (Number.isFinite(n) ? `${Number(n).toFixed(1)} s` : '—');

/* ---------- Heat helpers ---------- */
function classForScore(v: number, badLowGoodHigh = true) {
  const t = Math.max(0, Math.min(100, v));
  const g = badLowGoodHigh ? t : 100 - t;
  if (g >= 70) return 'bg-green-100 text-green-800';
  if (g >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}
const Pill: React.FC<{ children: React.ReactNode; tone: string; title?: string }> = ({ children, tone, title }) => (
  <span title={title} className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${tone}`}>{children}</span>
);

/* ---------- Mini-barras apiladas para distractores ---------- */
const StackedBar: React.FC<{ parts: { label: string; value: number }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded bg-gray-100">
      {parts.map((p, i) => (
        <div
          key={i}
          className="h-full"
          style={{
            width: `${(p.value * 100) / total}%`,
            background: ['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1'][i % 5],
          }}
          title={`${p.label}: ${Math.round((p.value * 100) / total)}%`}
        />
      ))}
    </div>
  );
};

/* ---------- Micro componentes (iconos de info homogéneos) ---------- */
const SectionInfoButton: React.FC<{ onClick: () => void; open: boolean; title?: string; className?: string }> = ({ onClick, open, title = 'Información', className }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs
                ${open ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-600'}
                hover:bg-indigo-50 hover:text-indigo-700 ${className || ''}`}
    title={title}
    aria-expanded={open}
    type="button"
  >
    <Info size={12} />
  </button>
);


const SectionInfoButtonSmall: React.FC<{ onClick: () => void; open: boolean; title?: string }> = ({ onClick, open, title = 'Información' }) => (
  <button
    onClick={onClick}
    className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border
                ${open ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-600'}
                hover:bg-indigo-50 hover:text-indigo-700`}
    title={title}
    aria-expanded={open}
    type="button"
  >
    <Info size={10} />
  </button>
);

const ExplainPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[13px] leading-snug text-indigo-900">
    {children}
  </div>
);

const ShowMoreLess: React.FC<{ text: string; limit?: number }> = ({ text, limit = 120 }) => {
  const [more, setMore] = useState(false);
  if (!text || text.length <= limit) return <>{text}</>;
  return (
    <span>
      {more ? text : text.slice(0, limit) + '…'}{' '}
      <button
        onClick={() => setMore(m => !m)}
        className="text-xs text-indigo-600 underline"
        type="button"
      >
        {more ? 'Ver menos' : 'Ver más'}
      </button>
    </span>
  );
};

/* ---------- Vista principal ---------- */
const DiagramStats: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>('');
  const [from, setFrom] = useState<string>(''); 
  const [to, setTo] = useState<string>('');     
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExtendedStats | null>(null);

  
  const [openReliabilityInfo, setOpenReliabilityInfo] = useState(false);
  const [openDiscrInfo, setOpenDiscrInfo] = useState(false);
  const [openDistractorsInfo, setOpenDistractorsInfo] = useState(false);
  const [openDriftInfo, setOpenDriftInfo] = useState(false);
  const [openRiskInfo, setOpenRiskInfo] = useState(false);


  
  const DRIFT_PAGE = 10;
  const [driftVisible, setDriftVisible] = useState(DRIFT_PAGE);
  useEffect(() => { setDriftVisible(DRIFT_PAGE); }, [id, from, to, stats?.drift?.length]);

  const showLoading = useDelayedFlag(loading);

  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error('Falta id');
        const d = await getDiagram(id);
        setTitle(d.title || 'Diagrama');

        const payload = await getDiagramStats(id);
        setStats(payload as ExtendedStats);
      } catch (e: any) {
        toast.error(e?.message || 'No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onApplyRange = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const payload = await getDiagramStats(id, {
        from: from || undefined,
        to: to || undefined
      });
      setStats(payload as ExtendedStats);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo filtrar el rango');
    } finally {
      setLoading(false);
    }
  };

  if (showLoading) {
    return (
      <PageWithHeader>
        <div className="p-6">Cargando…</div>
     </PageWithHeader>
    );
  }

  if (!stats) {
    return (
      <PageWithHeader>
        <div className="p-6 text-red-600">No hay datos.</div>
     </PageWithHeader>
    );
  }

  const k = stats.kpis;
  const reliability = stats.reliability?.kr20 ?? null;

  /* ===== Badge de consistencia (KR-20) ===== */
  const krBadge = (() => {
    if (reliability == null) return <Pill tone="bg-gray-100 text-gray-700">—</Pill>;
    const v = Math.max(0, Math.min(1, reliability));
    const tone = v >= 0.8 ? 'bg-green-100 text-green-800' : v >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
    return <Pill tone={tone} title="0–1 (más alto = más consistente)">{v.toFixed(2)}</Pill>;
  })();

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/supervisor/tests')}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              title="Volver"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-xs uppercase text-gray-500">Estudio del diagrama</div>
              <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
              <p className="text-gray-600">Estudio estadístico de diagrama</p>
            </div>
          </div>

          {/* Filtro de fechas */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Desde</label>
              <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}
                     className="rounded-lg border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Hasta</label>
              <input type="date" value={to} onChange={(e)=>setTo(e.target.value)}
                     className="rounded-lg border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <button
              onClick={onApplyRange}
              className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-medium"
              type="button"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* KPIs (4 básicos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPI icon={<Trophy className="h-5 w-5" />} label="Nota examen (media)"
               value={`${fmt10(k.examScoreAvg10)}/10`} />
          <KPI icon={<Activity className="h-5 w-5" />} label="Acierto en práctica"
               value={pct(k.learningAccuracyPct)} />
          <KPI icon={<Target className="h-5 w-5" />} label="Dominio (≥ 8/10)"
               value={pct(k.masteryRatePct)} />
          <KPI icon={<AlertTriangle className="h-5 w-5" />} label="En riesgo (≤ 5/10)"
               value={pct(k.atRiskRatePct)} />
        </div>

        {/* Bloques clave (consistencia, mejora, pistas) en grilla responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Examen consistente (con el MISMO icono-botón que otras secciones) */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Examen consistente (0–1)</span>
                  <SectionInfoButton onClick={() => setOpenReliabilityInfo(o => !o)} open={openReliabilityInfo} />
                </div>
                <Sigma className="h-5 w-5 text-gray-700" />
              </div>
              <div className="mt-1 text-2xl font-semibold">{krBadge as any}</div>
              <div className="text-[11px] text-gray-500">Más alto = resultados más estables</div>

              {openReliabilityInfo && (
                <ExplainPanel>
                  Indica si el examen evalúa <b>siempre lo mismo</b> (estable). Va de 0 a 1.
                  <div className="mt-1">Guía rápida: <b>0.80–1.00</b> muy estable · <b>0.70–0.79</b> aceptable · <b>&lt; 0.70</b> revisar preguntas.</div>
                </ExplainPanel>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-500">Mejora práctica → examen</span>
                <BarChart3 className="h-5 w-5 text-gray-700" />
              </div>
              <div className="mt-1 text-2xl font-semibold">{fmt10(k.practiceToExamDeltaPts)} pts</div>
              <div className="text-[11px] text-gray-500">Media por alumno</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-500">Uso de pistas</span>
                <Lightbulb className="h-5 w-5 text-gray-700" />
              </div>
              <div className="mt-1 text-2xl font-semibold">{pct(k.hintUsagePct)}</div>
              <div className="text-[11px] text-gray-500">Porcentaje de preguntas donde se pidió pista</div>
            </CardBody>
          </Card>
        </div>

        {/* === Calidad de las preguntas === */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Calidad de las preguntas</div>
            </div>

            {openDiscrInfo && (
              <ExplainPanel>
                <b>Diferencia de niveles (−1..1)</b>: Mide si la pregunta la aciertan los que sacan buena nota y la fallan los que sacan mala nota.<br></br> <b>≥ 0.30</b> Buena pregunta ; <b>0.10–0.29</b> Separa poco; <b>≈ 0</b> No distingue; <b> Negativo</b> La aciertan más los que peor nota total tienen → revisar
              </ExplainPanel>
            )}

            {!stats.itemQuality?.length ? (
              <div className="text-sm text-gray-500">Sin datos suficientes en el rango seleccionado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Pregunta</th>
                      <th className="py-2">% acierto</th>
                      <th className="py-2">
                        <span className="inline-flex items-center gap-1">
                          Diferencia niveles
                          <SectionInfoButtonSmall onClick={() => setOpenDiscrInfo(o => !o)} open={openDiscrInfo} />
                        </span>
                      </th>
                      <th className="py-2">Tiempo mediano</th>
                      <th className="py-2">Reclamaciones</th>
                      <th className="py-2">Reclam. aceptadas</th>
                      <th className="py-2">Intentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.itemQuality.map((q) => {
                      const diffTone = classForScore(q.pCorrectPct, true);
                      const discrScaled = Math.max(-1, Math.min(1, q.discrPointBiserial));
                      const discrPct = ((discrScaled + 1) / 2) * 100;
                      const discrTone = classForScore(discrPct, true);
                      const timeTone = classForScore(Math.min(100, (q.medianTimeSec ?? 0) * 5), false);
                      const claimTone = classForScore(q.claimRatePct, false);
                      const appr = q.claimApprovalRatePct == null ? '—' : pct(q.claimApprovalRatePct);
                      return (
                        <tr key={q.questionId} className="border-t">
                          <td className="py-2 pr-2">
                            <div className="max-w-[520px]" title={q.title}>
                              <ShowMoreLess text={q.title} />
                            </div>
                          </td>
                          <td className="py-2"><Pill tone={diffTone}>{pct(q.pCorrectPct)}</Pill></td>
                          <td className="py-2"><Pill tone={discrTone} title="−1..1 (más alto = separa mejor)">{q.discrPointBiserial.toFixed(2)}</Pill></td>
                          <td className="py-2"><Pill tone={timeTone}>{fmtSec1(q.medianTimeSec ?? undefined)}</Pill></td>
                          <td className="py-2"><Pill tone={claimTone}>{pct(q.claimRatePct)}</Pill></td>
                          <td className="py-2">{appr}</td>
                          <td className="py-2">{q.attempts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* === ¿Qué respuestas erróneas se eligen más? === */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">¿Qué respuestas erróneas se eligen más?</div>
              <SectionInfoButton onClick={() => setOpenDistractorsInfo(o => !o)} open={openDistractorsInfo} />
            </div>

            {openDistractorsInfo && (
              <ExplainPanel>
                Muestra qué opciones equivocadas atraen más clics.
                Sirve para detectar errores “atractivos” y mejorar enunciados u opciones así como ver los fallos comunes.
              </ExplainPanel>
            )}

            {!stats.distractors?.length ? (
              <div className="text-sm text-gray-500">Sin datos suficientes en el rango seleccionado.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupBy(stats.distractors, d => d.questionId)).slice(0, 6).map(([qid, arr]) => {
                  const title = stats.itemQuality?.find(i => i.questionId === qid)?.title ?? `Pregunta ${qid}`;
                  const parts = arr.map(a => ({ label: a.optionText, value: a.chosenPct }));
                  return (
                    <div key={qid} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <div className="text-sm font-medium mb-2"><ShowMoreLess text={title} /></div>
                      <StackedBar parts={parts} />
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                        {arr.map((a, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="truncate">{a.optionText}</span>
                            <span className="font-medium">{pct(a.chosenPct)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* === Aprendizaje y mejora === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
  <CardBody>
    <div className="text-lg font-semibold mb-1">Intentos hasta dominar</div>
    <div className="text-sm text-gray-600 mb-3">¿Cuántos intentos suelen necesitar para ≥ 8/10?</div>

    {stats.learningCurves ? (
      stats.learningCurves.attemptsToMasteryP50 != null ? (
        <div className="text-2xl font-semibold">
          {stats.learningCurves.attemptsToMasteryP50} intentos (mediana)
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          Sin datos suficientes en el rango seleccionado.
        </div>
      )
    ) : (
      <div className="text-sm text-gray-500">
        Sin datos suficientes en el rango seleccionado.
      </div>
    )}
  </CardBody>
</Card>
<Card>
  <CardBody>
    <div className="text-lg font-semibold mb-1">Mejora de learning a examen</div>
    <div className="text-sm text-gray-600 mb-3">Diferencia media de nota. <br></br>Debe estar seleccionada un rango de fecha.</div>

    {stats.learningCurves ? (
      <div className="flex items-center gap-2 text-2xl font-semibold">
        {(stats.learningCurves.deltaPracticeToExamAvgPts ?? 0) >= 0
          ? <TrendingUp className="h-6 w-6 text-green-600" />
          : <TrendingDown className="h-6 w-6 text-rose-600" />
        }
        {fmt10(stats.learningCurves.deltaPracticeToExamAvgPts)} pts
      </div>
    ) : (
      
      <div className="flex items-center gap-2 text-2xl font-semibold">
        {(k.practiceToExamDeltaPts ?? 0) >= 0
          ? <TrendingUp className="h-6 w-6 text-green-600" />
          : <TrendingDown className="h-6 w-6 text-rose-600" />
        }
        {fmt10(k.practiceToExamDeltaPts)} pts
      </div>
    )}
  </CardBody>
</Card>


        </div>

        {/* === Hotspots + Riesgo (adelantados) === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <div className="text-lg font-semibold mb-3">Preguntas más falladas</div>
              {!stats.hotspots.length ? (
                <div className="text-sm text-gray-500">Sin datos.</div>
              ) : (
                <div className="space-y-2">
                  {stats.hotspots.map(h => (
                    <div key={h.questionId} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                      <div className="text-sm font-medium"><ShowMoreLess text={h.title} /></div>
                      <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-gray-500">Error:</span> <span className="font-semibold">{pct(h.errorRatePct)}</span></div>
                        <div><span className="text-gray-500">Tiempo mediano:</span> <span className="font-semibold">{fmtSec1(h.medianTimeSec ?? undefined)}</span></div>
                        <div><span className="text-gray-500">Intentos:</span> <span className="font-semibold">{h.attempts ?? 0}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
  <CardBody>
    <div className="flex items-center justify-between mb-2">
      <div className="text-lg font-semibold">Alumnado en riesgo</div>
      <SectionInfoButton onClick={() => setOpenRiskInfo(o => !o)} open={openRiskInfo} />
    </div>

    {openRiskInfo && (
      <ExplainPanel>
        Consideramos “en riesgo” a quien en su <b>último examen</b> de este diagrama ha sacado <b>≤ 5/10</b>.
        Útil para priorizar refuerzos. Se muestra su número de intentos y la fecha del último intento.
      </ExplainPanel>
    )}

    {!stats.riskStudents.length ? (
      <div className="text-sm text-gray-500">Sin alumnos en riesgo en el rango.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Alumno</th>
              <th className="py-2">Últ. nota</th>
              <th className="py-2">Intentos</th>
              <th className="py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {stats.riskStudents.map(r => {
              const fullName = [r.name, r.lastName].filter(Boolean).join(' ') || r.studentId;
              return (
                <tr key={r.studentId} className="border-t">
                  <td className="py-2">{fullName}</td>
                  <td className="py-2 font-semibold">{fmt10(r.lastExamScore10)}/10</td>
                  <td className="py-2">{r.attempts}</td>
                  <td className="py-2">{r.lastAttemptAt ? new Date(r.lastAttemptAt).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardBody>
</Card>
        </div>

        {/* === Deriva de preguntas (último bloque, sin “Cambio tiempo”) === */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Deriva de preguntas (cambio en el rango)</div>
              <SectionInfoButton onClick={() => setOpenDriftInfo(o => !o)} open={openDriftInfo} />
            </div>

            {openDriftInfo && (
              <ExplainPanel>
                Compara la <b>primera mitad</b> vs la <b>segunda mitad</b> del periodo elegido. “Cambio aciertos”
                indica si ahora se acierta más (positivo) o menos (negativo).
              </ExplainPanel>
            )}

            {!stats.drift?.length ? (
              <div className="text-sm text-gray-500 mt-2">Sin datos suficientes en el rango seleccionado.</div>
            ) : (
              <>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2">Pregunta</th>
                        <th className="py-2">Cambio aciertos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.drift.slice(0, driftVisible).map((d) => {
                        const upAcc = d.deltaPCorrectPct >= 0;
                        return (
                          <tr key={d.questionId} className="border-t">
                            <td className="py-2 pr-2">
                              <div className="max-w-[520px]" title={d.title || d.questionId}>
                                <ShowMoreLess text={d.title || d.questionId} />
                              </div>
                            </td>
                            <td className="py-2">
                              <span
                                title="Segunda mitad − primera mitad (en % de aciertos)"
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${upAcc ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}
                              >
                                {upAcc ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                                {pct(Math.abs(d.deltaPCorrectPct))}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex justify-center gap-2">
                  {driftVisible < (stats.drift?.length ?? 0) && (
                    <button
                      onClick={() => setDriftVisible(v => v + DRIFT_PAGE)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                      type="button"
                    >
                      Cargar más
                    </button>
                  )}
                  {driftVisible > DRIFT_PAGE && (
                    <button
                      onClick={() => setDriftVisible(DRIFT_PAGE)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                      type="button"
                    >
                      Cargar menos
                    </button>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
   </PageWithHeader>
  );
};

export default DiagramStats;

/* ---------- utils locales ---------- */
function groupBy<T, K extends string | number>(arr: T[], keyFn: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, cur) => {
    const k = keyFn(cur);
    (acc[k] ||= []).push(cur);
    return acc;
  }, {} as Record<K, T[]>);
}
