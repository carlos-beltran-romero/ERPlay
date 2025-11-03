import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { toast } from 'react-toastify';
// ⬇️ usamos el servicio de test-sessions
import {
  startTestSession,
  patchResult as patchTestResult,
  logEvent as logTestEvent,
  finishSession,
  type StartedSession,
} from '../../services/tests';
import { createClaim } from '../../services/claims';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  Lightbulb,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Flag,
  Info,
} from 'lucide-react';
import { resolveAssetUrl } from '../../shared/utils/url';

type PracticeQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  id?: string; // id real de pregunta si viene
  // resultId interno para parchar ese resultado
  __resultId: string;
};

type PracticePayload = {
  diagram: { id: string; title: string; path: string | null };
  questions: PracticeQuestion[];
};

const N_QUESTIONS = 10;

const LearningMode: React.FC = () => {
  const navigate = useNavigate();

  // ===== Estado de sesión de test =====
  const [sessionId, setSessionId] = useState<string>('');
  const [finished, setFinished] = useState(false);

  // control de tiempo
  const [, setPerQSeconds] = useState<number[]>([]); // opcional, solo tracking UI
  const lastTickRef = useRef<number | null>(null); // timestamp ms de entrada a pregunta actual

  // ===== Estado de carga/payload =====
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PracticePayload | null>(null);

  // ===== Estado por pregunta =====
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Array<number | null>>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [hintShown, setHintShown] = useState<boolean[]>([]);
  const [claimed, setClaimed] = useState<boolean[]>([]);

  // pantalla de instrucciones
  const [started, setStarted] = useState(false);

  // modal reclamación
  const [showClaim, setShowClaim] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // ===== Helpers de tiempo =====
  const computeDeltaAndReset = () => {
    const now = Date.now();
    if (lastTickRef.current == null) {
      lastTickRef.current = now;
      return 0;
    }
    const deltaSec = Math.max(0, Math.floor((now - lastTickRef.current) / 1000));
    lastTickRef.current = now;
    // tracking opcional por pregunta
    setPerQSeconds((prev) => {
      const next = prev.slice();
      next[current] = (next[current] || 0) + deltaSec;
      return next;
    });
    return deltaSec;
  };

  const flushCurrentTime = async () => {
    if (!payload || !sessionId) return;
    const delta = computeDeltaAndReset();
    if (delta > 0) {
      const rid = payload.questions[current].__resultId;
      try {
        await patchTestResult(sessionId, rid, { timeSpentSecondsDelta: delta });
      } catch {
        /* no molestar al usuario por timing */
      }
    }
  };

  // ===== Carga de práctica (nuevo test-session) =====
  const loadPractice = async () => {
    // si hay sesión previa, intenta finalizarla antes de iniciar otra
    try {
      if (sessionId && !finished) {
        await flushCurrentTime();
        await finishSession(sessionId);
      }
    } catch {
      /* ignore */
    }

    setLoading(true);
    setFinished(false);
    setStarted(false);
    lastTickRef.current = null;

    try {
      const data: StartedSession = await startTestSession({ mode: 'learning', limit: N_QUESTIONS });

      // mapear a nuestro payload con resultId incrustado
      const mapped: PracticePayload = {
        diagram: data.diagram,
        questions: data.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex!, // en learning viene
          hint: q.hint,
          id: q.questionId,
          __resultId: q.resultId,
        })),
      };

      setSessionId(data.sessionId);
      setPayload(mapped);
      setCurrent(0);
      setSelected(new Array(mapped.questions.length).fill(null));
      setRevealed(new Array(mapped.questions.length).fill(false));
      setHintShown(new Array(mapped.questions.length).fill(false));
      setClaimed(new Array(mapped.questions.length).fill(false));
      setPerQSeconds(new Array(mapped.questions.length).fill(0));
    } catch (e: any) {
      toast.error(e.message || 'No se pudo iniciar la práctica');
      navigate('/student/play-menu', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const didInitRef = useRef(false);



  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadPractice();
    return () => {
      (async () => {
        try {
          if (sessionId && !finished) {
            await flushCurrentTime();
            await finishSession(sessionId);
          }
        } catch {}
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // al pulsar "Comenzar práctica"
  const onStart = async () => {
    setStarted(true);
    // arranca timing y evento
    lastTickRef.current = Date.now();
    try {
      if (sessionId) {
        await logTestEvent(sessionId, { type: 'start_session' });
        // también logeamos que empieza viendo la primera pregunta
        if (payload?.questions[0]?.__resultId) {
          await logTestEvent(sessionId, {
            type: 'view_question',
            resultId: payload.questions[0].__resultId,
            payload: { index: 0 },
          });
        }
      }
    } catch {
      /* ignore */
    }
  };

  // cuando cambia de pregunta, log de vista + reset de tick
  useEffect(() => {
    (async () => {
      if (!started || !payload || !sessionId) return;
      // ya hemos hecho flush en los handlers prev/next; aquí solo marcamos nueva vista
      lastTickRef.current = Date.now();
      try {
        const rid = payload.questions[current].__resultId;
        await logTestEvent(sessionId, { type: 'view_question', resultId: rid, payload: { index: current } });
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, started]);

  const qCount = payload?.questions.length ?? 0;
  const answeredCount = useMemo(() => selected.filter((v) => v !== null).length, [selected]);

  // seleccionar respuesta (guarda selección + tiempo + revela)
  const choose = async (idx: number, opt: number) => {
    if (!payload || !sessionId) return;
    // no permitir reintentos en learning (como tenías)
    if (selected[idx] !== null) return;

    // delta de tiempo en esta pregunta
    const delta = computeDeltaAndReset();
    const rid = payload.questions[idx].__resultId;

    try {
      await patchTestResult(sessionId, rid, {
        selectedIndex: opt,
        revealedAnswer: true,
        timeSpentSecondsDelta: delta,
      });
      await logTestEvent(sessionId, {
        type: 'submit_answer',
        resultId: rid,
        payload: { selectedIndex: opt },
      });
    } catch {
      // si falla el guardado, no bloquees la UX, sigue
    }

    // feedback inmediato en UI
    setSelected((prev) => {
      const next = prev.slice();
      next[idx] = opt;
      return next;
    });
    setRevealed((prev) => {
      if (prev[idx]) return prev;
      const next = prev.slice();
      next[idx] = true;
      return next;
    });

    // reinicia contador para seguir midiendo si se queda en esta pregunta
    lastTickRef.current = Date.now();
  };

  const toggleHint = async (idx: number) => {
    if (!payload || !sessionId) {
      setHintShown((prev) => {
        const next = prev.slice();
        next[idx] = !next[idx];
        return next;
      });
      return;
    }

    setHintShown((prev) => {
      const next = prev.slice();
      const willShow = !next[idx];
      next[idx] = willShow;
      return next;
    });

    // si pasa a mostrarse la pista por primera vez => marcar usedHint
    const willShow = !hintShown[idx];
    if (willShow) {
      try {
        const rid = payload.questions[idx].__resultId;
        await patchTestResult(sessionId, rid, { usedHint: true });
        await logTestEvent(sessionId, { type: 'show_hint', resultId: rid });
      } catch {
        /* ignore */
      }
    }
  };

  // navegación
  const prevQ = async () => {
    if (!payload) return;
    await flushCurrentTime();
    setCurrent((c) => Math.max(0, c - 1));
  };
  const nextQ = async () => {
    if (!payload) return;
    await flushCurrentTime();
    setCurrent((c) => Math.min(qCount - 1, c + 1));
  };

  // resumen
  const correctCount = useMemo(() => {
    if (!payload) return 0;
    return payload.questions.reduce((acc, q, i) => acc + (selected[i] === q.correctIndex ? 1 : 0), 0);
  }, [payload, selected]);

  // finalizar sesión y volver
  const finishAndBack = async () => {
    try {
      if (sessionId && !finished) {
        await flushCurrentTime();
        await finishSession(sessionId);
        setFinished(true);
      }
    } catch {
      /* ignore */
    } finally {
      navigate('/student/dashboard');
    }
  };

  // ======= UI =======
  if (loading) {
    return (
      <PageWithHeader>
        <div className="p-6 text-gray-600">Cargando práctica…</div>
     </PageWithHeader>
    );
  }

  if (!payload || qCount === 0) {
    return (
      <PageWithHeader>
        <div className="p-6 text-gray-600">No se pudo cargar la práctica.</div>
     </PageWithHeader>
    );
  }

  if (!started) {
    return (
      <PageWithHeader>
        <div className="mx-auto w-full max-w-3xl p-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">Modo Aprendizaje</h1>
            <p className="mt-2 text-gray-600">Lee estas indicaciones antes de comenzar:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>Sin límite de tiempo: practica a tu ritmo.</li>
              <li>Feedback inmediato tras seleccionar tu respuesta.</li>
              <li>Usa <strong>Pista</strong> para ver una ayuda contextual.</li>
              <li>
                <strong>Reclamaciones:</strong> solo si fallas esa pregunta, podrás justificar por qué tu opción sería
                la correcta para revisión del profesor.
              </li>
            </ul>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={finishAndBack}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={onStart}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 inline-flex items-center gap-2"
              >
                <Info size={16} />
                Comenzar práctica
              </button>
            </div>
          </div>
        </div>
     </PageWithHeader>
    );
  }

  const q = payload.questions[current];
  const answered = selected[current] !== null;
  const isCorrect = answered && selected[current] === q.correctIndex;

  const canClaim =
    revealed[current] && selected[current] !== null && selected[current] !== q.correctIndex && !claimed[current];

  const openClaim = () => {
    if (!canClaim) {
      toast.info('Solo puedes reclamar una pregunta que hayas respondido mal.');
      return;
    }
    setClaimText('');
    setShowClaim(true);
  };

  const submitClaim = async () => {
    if (!payload || !canClaim) return;
    const chosenIndex = selected[current] as number;
    try {
      setSubmittingClaim(true);
      await createClaim({
        testResultId: payload.questions[current].__resultId, // ⬅️ NUEVO
        questionId: q.id, // opcional
        diagramId: payload.diagram.id,
        prompt: q.prompt,
        options: q.options,
        chosenIndex,
        correctIndex: q.correctIndex,
        explanation: claimText.trim(),
      });
      toast.success('Reclamación enviada. Un profesor la revisará.');
      setShowClaim(false);
      setClaimed((prev) => {
        const next = prev.slice();
        next[current] = true;
        return next;
      });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo enviar la reclamación');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-gray-500">Modo aprendizaje</div>
              <h1 className="text-xl font-semibold">{payload.diagram.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-indigo-700">
                {answeredCount}/{qCount} respondidas
              </div>
              <button
                onClick={loadPractice}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                title="Reiniciar con otro conjunto aleatorio"
              >
                <RotateCcw size={16} />
                Reiniciar práctica
              </button>
            </div>
          </div>
        </div>

        {/* Diagrama */}
        <div className="mt-5 flex justify-center">
          {payload.diagram.path ? (
           <img
           src={resolveAssetUrl(payload.diagram.path) || undefined}
           alt={payload.diagram.title}
           className="max-h-[28rem] w-full rounded-lg border object-contain"
         />
         
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <ImageIcon size={16} /> Sin imagen
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Preguntas */}
          <main className="lg:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 text-sm text-gray-600">
                Pregunta {current + 1} de {qCount}
              </div>

              <div className="text-base font-medium whitespace-pre-wrap">{q.prompt}</div>

              {/* Opciones */}
              <div className="mt-4 space-y-2">
                {q.options.map((opt, oi) => {
                  const chosen = selected[current];
                  const show = revealed[current];
                  const isChosen = chosen === oi;
                  const isRight = oi === q.correctIndex;

                  let boxClasses = 'rounded-xl border px-3 py-2 transition';
                  let icon: React.ReactNode = null;

                  if (show) {
                    if (isRight) {
                      boxClasses += ' border-emerald-400 bg-emerald-50';
                      icon = <CheckCircle2 size={16} className="text-emerald-700" />;
                    } else if (isChosen && !isRight) {
                      boxClasses += ' border-rose-400 bg-rose-50';
                      icon = <XCircle size={16} className="text-rose-700" />;
                    } else {
                      boxClasses += ' border-gray-200 bg-white opacity-80';
                    }
                  } else {
                    boxClasses += isChosen ? ' border-indigo-500 bg-indigo-50' : ' border-gray-200 bg-white hover:bg-gray-50';
                  }

                  return (
                    <button
                      key={oi}
                      type="button"
                      className={`w-full text-left ${boxClasses}`}
                      onClick={() => choose(current, oi)}
                      disabled={revealed[current]}
                      title={revealed[current] ? 'Respuesta bloqueada' : 'Seleccionar'}
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {revealed[current] && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
                    isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isCorrect ? '¡Correcto!' : 'Incorrecto. Revisa la pista si es necesario.'}
                </div>
              )}

              {/* Pista */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => toggleHint(current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  <Lightbulb size={16} />
                  {hintShown[current] ? 'Ocultar pista' : 'Mostrar pista'}
                </button>

                {hintShown[current] && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {q.hint?.trim() || 'Sin pista para esta pregunta.'}
                  </div>
                )}
              </div>

              {/* Reclamación */}
              {canClaim && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openClaim}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-50 text-rose-700"
                    title="Reclamar esta pregunta"
                  >
                    <Flag size={16} />
                    Reclamar esta pregunta
                  </button>
                </div>
              )}

              {/* Navegación */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={prevQ}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${
                    current === 0 ? 'cursor-not-allowed border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={current === 0}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>

                <button
                  onClick={nextQ}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${
                    current >= qCount - 1 ? 'cursor-not-allowed border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={current >= qCount - 1}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={finishAndBack}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Volver al menú
              </button>
            </div>
          </main>

          {/* Resumen lateral */}
          <aside className="lg:col-span-4">
            <div className="sticky top-4 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">Resumen</div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="text-xs text-gray-500">Respondidas</div>
                    <div className="text-lg font-semibold">{answeredCount}</div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="text-xs text-gray-500">Aciertos</div>
                    <div className="text-lg font-semibold">{correctCount}</div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="text-xs text-gray-500">Pistas</div>
                    <div className="text-lg font-semibold">{hintShown.filter(Boolean).length}</div>
                  </div>
                </div>

                <button
                  onClick={loadPractice}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <RotateCcw size={16} />
                  Reiniciar práctica
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal reclamación */}
      {showClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold">Reclamar esta pregunta</h3>
              <p className="mt-1 text-sm text-gray-600">
                Explica por qué consideras que tu respuesta es correcta y la del test no.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-gray-700">
                <div className="font-medium">Diagrama:</div>
                <div>{payload.diagram.title}</div>
              </div>

              <div className="text-sm text-gray-700">
                <div className="font-medium">Pregunta:</div>
                <div className="whitespace-pre-wrap">{q.prompt}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-gray-500">Tu respuesta</div>
                  <div className="mt-1 font-medium">
                    {selected[current] !== null
                      ? `${String.fromCharCode(65 + (selected[current] as number))}. ${q.options[selected[current] as number]}`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-gray-500">Respuesta oficial</div>
                  <div className="mt-1 font-medium">
                    {`${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Explicación (obligatoria)</label>
                <textarea
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Argumenta tu reclamación con detalle…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <button
                onClick={() => setShowClaim(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitClaim}
                disabled={submittingClaim || !canClaim || !claimText.trim()}
                className={`rounded-xl px-5 py-2 text-sm font-medium text-white ${
                  submittingClaim || !canClaim || !claimText.trim()
                    ? 'bg-rose-300 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {submittingClaim ? 'Enviando…' : 'Enviar reclamación'}
              </button>
            </div>
          </div>
        </div>
      )}
   </PageWithHeader>
  );
};

export default LearningMode;
