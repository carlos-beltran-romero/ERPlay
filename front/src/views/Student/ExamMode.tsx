import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PageWithHeader from '../PageWithHeader';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  startTestSession,
  patchResult as patchTestResult,
  logEvent as logTestEvent,
  finishSession,
  type StartedSession,
} from '../../services/tests';
import { Clock, ChevronRight, Image as ImageIcon, Info } from 'lucide-react';

type ExamQuestion = {
  prompt: string;
  options: string[];
  id?: string;
  __resultId: string;
};

type ExamPayload = {
  diagram: { id: string; title: string; path: string | null };
  questions: ExamQuestion[];
};

const EXAM_SECONDS = 10 * 60;

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const resolveImgUrl = (p?: string | null) => {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  let base =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  base = (base || '').replace(/\/+$/, '').replace(/\/api$/i, '');
  const rel = ('/' + String(p)).replace(/\/{2,}/g, '/');
  return `${base}${rel}`;
};

const ExamMode: React.FC = () => {
  const navigate = useNavigate();

  // ===== Estado sesión/test =====
  const [sessionId, setSessionId] = useState<string>('');
  const sessionIdRef = useRef<string>('');
  const [payload, setPayload] = useState<ExamPayload | null>(null);

  // ===== Estado de UI =====
  const [started, setStarted] = useState(false); // hasta que el alumno pulse "Comenzar"
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===== Respuestas / navegación =====
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [current, setCurrent] = useState(0);

  // ===== Tiempo =====
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [usedSeconds, setUsedSeconds] = useState(0);
  const tickerRef = useRef<number | null>(null);

  // ===== Tiempo por pregunta =====
  const [perQSeconds, setPerQSeconds] = useState<number[]>([]);
  const lastTickRef = useRef<number | null>(null);

  const computeDeltaAndReset = () => {
    const now = Date.now();
    if (lastTickRef.current == null) {
      lastTickRef.current = now;
      return 0;
    }
    const deltaSec = Math.max(0, Math.floor((now - lastTickRef.current) / 1000));
    lastTickRef.current = now;
    setPerQSeconds(prev => {
      const next = prev.slice();
      next[current] = (next[current] || 0) + deltaSec;
      return next;
    });
    return deltaSec;
  };

  const flushCurrentTime = useCallback(async () => {
    if (!payload || !sessionIdRef.current) return;
    const delta = computeDeltaAndReset();
    if (delta > 0) {
      const rid = payload.questions[current].__resultId;
      try {
        await patchTestResult(sessionIdRef.current, rid, { timeSpentSecondsDelta: delta });
      } catch {}
    }
  }, [payload, current]);

  // ===== Finalización segura =====
  const finalizedRef = useRef(false);
  const finalizeExam = useCallback(
    async (reason: 'submit' | 'timeout' | 'all-answered' | 'unload') => {
      if (finalizedRef.current || !sessionIdRef.current) return;
      finalizedRef.current = true;
      try {
        await flushCurrentTime();
        await finishSession(sessionIdRef.current);
      } catch (e: any) {
        if (reason !== 'unload') toast.error(e?.message || 'No se pudo finalizar el examen');
      } finally {
        if (reason !== 'unload') navigate('/student/my-tests');
      }
    },
    [flushCurrentTime, navigate]
  );

  // ===== Temporizador global (solo cuando empezó) =====
  useEffect(() => {
    if (!started || finished) return;
    if (tickerRef.current) window.clearInterval(tickerRef.current);
    tickerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(tickerRef.current!);
          setFinished(true);
          toast.info('Tiempo agotado. Enviando examen…');
          void finalizeExam('timeout');
          return 0;
        }
        return prev - 1;
      });
      setUsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (tickerRef.current) window.clearInterval(tickerRef.current);
    };
  }, [started, finished, finalizeExam]);

  // ===== Cerrar pestaña/refresh => finalizar =====
  useEffect(() => {
    const onUnload = () => { void finalizeExam('unload'); };
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('beforeunload', onUnload); };
  }, [finalizeExam]);

  const qCount = payload?.questions.length ?? 0;
  const answeredCount = useMemo(() => answers.filter(a => a !== null).length, [answers]);
  const allAnswered = qCount > 0 && answeredCount === qCount;

  useEffect(() => {
    if (!started || finished) return;
    if (allAnswered) {
      setFinished(true);
      toast.success('Examen entregado');
      void finalizeExam('all-answered');
    }
  }, [allAnswered, started, finished, finalizeExam]);

  // ===== Iniciar (CREA la sesión aquí) =====
  const startExamNow = async () => {
    setLoading(true);
    try {
      const data: StartedSession = await startTestSession({ mode: 'exam', limit: 10 });
      const mapped: ExamPayload = {
        diagram: data.diagram,
        questions: data.questions.map(q => ({
          prompt: q.prompt,
          options: q.options,
          id: q.questionId,
          __resultId: q.resultId,
        })),
      };
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      setPayload(mapped);
      setAnswers(new Array(mapped.questions.length).fill(null));
      setPerQSeconds(new Array(mapped.questions.length).fill(0));
      setCurrent(0);
      setTimeLeft(EXAM_SECONDS);
      setUsedSeconds(0);

      setStarted(true);
      lastTickRef.current = Date.now();
      try {
        await logTestEvent(data.sessionId, { type: 'start_session' });
        const rid0 = mapped.questions[0]?.__resultId;
        if (rid0) await logTestEvent(data.sessionId, { type: 'view_question', resultId: rid0, payload: { index: 0 } });
      } catch {}
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo iniciar el examen');
      navigate('/student/play-menu', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // ===== Elegir respuesta =====
  const chooseAnswer = async (idx: number, opt: number) => {
    if (!payload || !sessionIdRef.current) return;
    setAnswers(prev => {
      if (prev[idx] !== null) {
        toast.info('Esta pregunta ya fue respondida y no se puede cambiar.');
        return prev;
      }
      const copy = prev.slice();
      copy[idx] = opt;
      return copy;
    });

    const delta = computeDeltaAndReset();
    const rid = payload.questions[idx].__resultId;
    try {
      await patchTestResult(sessionIdRef.current, rid, {
        selectedIndex: opt,
        timeSpentSecondsDelta: delta,
      });
      await logTestEvent(sessionIdRef.current, {
        type: 'submit_answer',
        resultId: rid,
        payload: { selectedIndex: opt },
      });
    } catch {}
    lastTickRef.current = Date.now();
  };

  // ===== Siguiente =====
  const goNext = async () => {
    if (answers[current] === null) {
      toast.warning('Debes seleccionar una respuesta antes de continuar.');
      return;
    }
    await flushCurrentTime();

    if (payload && current < payload.questions.length - 1) {
      setCurrent(c => c + 1);
      try {
        const rid = payload.questions[current + 1].__resultId;
        await logTestEvent(sessionIdRef.current, { type: 'view_question', resultId: rid, payload: { index: current + 1 } });
      } catch {}
    } else {
      setFinished(true);
      void finalizeExam('submit');
    }
  };

  const submit = async () => {
    setFinished(true);
    await finalizeExam('submit');
  };

  // ===== UI =====
  if (!started) {
    return (
      <PageWithHeader>
        <div className="mx-auto w-full max-w-3xl p-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">Modo Examen</h1>
            <p className="mt-2 text-gray-600">Lee atentamente las indicaciones antes de comenzar:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-gray-700">
              <li>Dispones de <strong>10 minutos</strong> para completar el examen.</li>
              <li>El examen contiene <strong>10</strong> preguntas seleccionadas al azar.</li>
              <li><strong>No se puede volver a preguntas anteriores</strong>.</li>
              <li><strong>Una vez marques una respuesta, no podrás cambiarla</strong>.</li>
              <li>El examen se entregará automáticamente al terminar el tiempo o al responder todas las preguntas.</li>
            </ul>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => navigate('/student/play-menu')}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={startExamNow}
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Clock size={16} />
                {loading ? 'Preparando…' : 'Comenzar examen'}
              </button>
            </div>
          </div>
        </div>
      </PageWithHeader>
    );
  }

  if (!payload) {
    return (
      <PageWithHeader>
        <div className="p-6 text-gray-600">Cargando examen…</div>
      </PageWithHeader>
    );
  }

  const q = payload.questions[current];

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
        {/* Barra superior */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-gray-500">Examen</div>
              <h1 className="text-xl font-semibold">{payload.diagram.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5">
                <Clock size={16} />
                <span className={timeLeft <= 30 ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-indigo-700">
                {answeredCount}/{qCount} respondidas
              </div>
              <button
                onClick={submit}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Entregar examen
              </button>
            </div>
          </div>
        </div>

        {/* Diagrama */}
        <div className="mt-5 flex justify-center">
          {payload.diagram.path ? (
            <img
              src={resolveImgUrl(payload.diagram.path) || undefined}
              alt={payload.diagram.title}
              className="h-72 md:h-96 rounded-lg border object-contain"
            />
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <ImageIcon size={16} /> Sin imagen
            </div>
          )}
        </div>

        {/* Pregunta actual */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-2 text-sm text-gray-600">Pregunta {current + 1} de {qCount}</div>
          <div className="text-base font-medium whitespace-pre-wrap">{q.prompt}</div>

          <div className="mt-4 space-y-2">
            {q.options.map((opt, oi) => {
              const locked = answers[current] !== null;
              const checked = answers[current] === oi;
              return (
                <label
                  key={oi}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                  } ${locked ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={`q-${current}`}
                    className="h-4 w-4"
                    checked={checked}
                    disabled={locked}
                    onChange={() => chooseAnswer(current, oi)}
                  />
                  <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span>
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              onClick={goNext}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${
                answers[current] === null
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={answers[current] === null}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </PageWithHeader>
  );
};

export default ExamMode;
