
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { useDelayedFlag } from '../../shared/hooks/useDelayedFlag';
import {
  listPendingQuestions,
  verifyQuestion,
  getAutoApproveMode,
  setAutoApproveMode,
  type PendingQuestion,
} from '../../services/questions';
import {
  listPendingClaims,
  verifyClaim,
  getPendingClaimsCount,
  type PendingClaim,
} from '../../services/claims';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Image as ImageIcon,
  User as UserIcon,
  Mail,
  Flag,
  ArrowLeft,
} from 'lucide-react';

const letter = (i: number) => String.fromCharCode(65 + i);

/* ---------- Utilidades UI ---------- */
const joinName = (name?: string | null, lastName?: string | null) =>
  `${name?.trim() || ''} ${lastName?.trim() || ''}`.trim() || '—';

/** Texto expandible con "Ver más / Ver menos" (por caracteres) */
const ExpandableText: React.FC<{
  text?: string | null;
  clamp?: number;           
  className?: string;
  inline?: boolean;         
}> = ({ text, clamp = 220, className, inline }) => {
  const [expanded, setExpanded] = useState(false);
  const t = (text || '').trim();

  if (!t) return <span className={className}>—</span>;

  const needsToggle = t.length > clamp;
  const shown = !needsToggle || expanded ? t : t.slice(0, clamp) + '…';

  const Cmp: any = inline ? 'span' : 'div';
  return (
    <Cmp className={className}>
      <span className="whitespace-pre-wrap break-words">{shown}</span>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="ml-2 inline-flex items-center text-indigo-600 hover:text-indigo-700 text-xs font-medium"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </Cmp>
  );
};

const VerifyQuestions: React.FC = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState<'questions' | 'claims'>('questions');

  
  const [qLoading, setQLoading] = useState(true);
  const [pendingQ, setPendingQ] = useState<PendingQuestion[]>([]);
  const [qCount, setQCount] = useState<number>(0);
  const [qSubmitting, setQSubmitting] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [showApproveAllModal, setShowApproveAllModal] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);


  const [cLoading, setCLoading] = useState(true);
  const [pendingC, setPendingC] = useState<PendingClaim[]>([]);
  const [cCount, setCCount] = useState<number>(0);
  const [cSubmitting, setCSubmitting] = useState<string | null>(null);


  const [claimModal, setClaimModal] = useState<{
    claim: PendingClaim;
    decision: 'approve' | 'reject';
    comment?: string;
    rejectOtherSolutions?: boolean;
    rejectSameSolution?: boolean;
  } | null>(null);


  const [lightbox, setLightbox] = useState<{ src: string; title?: string } | null>(null);


  const [hasTypedComment, setHasTypedComment] = useState(false);
  const qShowLoading = useDelayedFlag(qLoading);
  const cShowLoading = useDelayedFlag(cLoading);

  
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasTypedComment) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasTypedComment]);

  const goBack = () => {
    navigate('/supervisor/dashboard');
  };

  const loadAll = async () => {
    setQLoading(true);
    setCLoading(true);
    try {

      const [rawQuestions, rawClaims, pendingClaimsCount, autoFlag] = await Promise.all([
        listPendingQuestions(),
        listPendingClaims(),
        getPendingClaimsCount(),
        getAutoApproveMode(),
      ]);

      
      const claimedIds = new Set(
        rawClaims.map(c => c.questionId).filter(Boolean) as string[]
      );

      
      const filteredQ = rawQuestions.filter(q => !claimedIds.has(q.id));

      setPendingQ(filteredQ);
      setQCount(filteredQ.length);
      setPendingC(rawClaims);
      setCCount(pendingClaimsCount);
      setAutoApprove(Boolean(autoFlag));
    } catch (e: any) {
      toast.error(e.message || 'No se pudo cargar la revisión');
    } finally {
      setQLoading(false);
      setCLoading(false);
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);


  const approveAllQuestions = async () => {
    if (pendingQ.length === 0) return;
    setApprovingAll(true);
    try {
      await Promise.all(pendingQ.map((q) => verifyQuestion(q.id, 'approve')));
      toast.success('Todas las preguntas nuevas han sido aprobadas.');
      setPendingQ([]);
      setQCount(0);
    } catch (e: any) {
      toast.error(e.message || 'No se pudieron aprobar todas las preguntas');
    } finally {
      setApprovingAll(false);
      setShowApproveAllModal(false);
    }
  };

  const onToggleAutoApprove = async (checked: boolean) => {
    setAutoSaving(true);
    try {
      await setAutoApproveMode(checked);
      setAutoApprove(checked);
      toast.success(
        checked
          ? 'Modo automático activado: las nuevas preguntas se aprobarán solas.'
          : 'Modo automático desactivado. Ahora debes revisar cada pregunta.'
      );
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar el modo automático');
    } finally {
      setAutoSaving(false);
    }
  };


  const onDecideQuestion = async (q: PendingQuestion, decision: 'approve' | 'reject', comment?: string) => {
    setQSubmitting(q.id);
    try {
      await verifyQuestion(q.id, decision, comment);
      toast.success(decision === 'approve' ? 'Pregunta aprobada' : 'Pregunta rechazada');
      setPendingQ(prev => {
        const next = prev.filter(p => p.id !== q.id);
        setQCount(next.length);
        return next;
      });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo aplicar la revisión');
    } finally {
      setQSubmitting(null);
    }
  };

  const submitClaimDecision = async (payload: {
    claim: PendingClaim;
    decision: 'approve' | 'reject';
    comment?: string;
    rejectOtherSolutions?: boolean;
    rejectSameSolution?: boolean;
  }) => {
    setCSubmitting(payload.claim.id);
    try {
      await verifyClaim(payload.claim.id, payload.decision, payload.comment, {
        rejectOtherSolutions: payload.rejectOtherSolutions,
        rejectSameSolution: payload.rejectSameSolution,
      });
      toast.success(payload.decision === 'approve' ? 'Reclamación aprobada' : 'Reclamación rechazada');
      setClaimModal(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || 'No se pudo aplicar la revisión');
    } finally {
      setCSubmitting(null);
    }
  };

  const openClaimModal = (claim: PendingClaim, decision: 'approve' | 'reject') => {
    const el = document.getElementById(`c-comment-${claim.id}`) as HTMLTextAreaElement | null;
    const comment = el?.value?.trim() || undefined;
    setClaimModal({
      claim,
      decision,
      comment,
      rejectOtherSolutions: decision === 'approve',
      rejectSameSolution: true,
    });
  };

  const Header = () => (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Revisión</h1>
        <p className="text-gray-600">Aprueba o rechaza preguntas y reclamaciones.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          Preguntas: {qCount}
        </span>
        <span className="inline-flex items-center rounded-xl bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
          Reclamaciones: {cCount}
        </span>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCcw size={16} />
          Actualizar
        </button>
      </div>
    </div>
  );

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Volver */}
        <div className="mb-4">
          <button
            onClick={goBack}
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-2 hover:bg-gray-50"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <Header />

        {/* Tabs */}
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => setTab('questions')}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              tab === 'questions'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            Preguntas
          </button>
          <button
            onClick={() => setTab('claims')}
            className={`rounded-xl px-3 py-1.5 text-sm border inline-flex items-center gap-1 ${
              tab === 'claims'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Flag size={14} /> Reclamaciones
          </button>
        </div>

        {/* PREGUNTAS */}
        {tab === 'questions' && (
          <>
            {qShowLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Cargando…</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={autoApprove}
                      disabled={autoLoading || autoSaving}
                      onChange={(e) => onToggleAutoApprove(e.target.checked)}
                    />
                    <span>
                      <strong>Modo automático</strong>
                      <br />
                      <span className="text-gray-600">
                        {autoApprove
                          ? 'Las preguntas nuevas se aprobarán en cuanto lleguen.'
                          : 'Revisa manualmente las preguntas pendientes.'}
                      </span>
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <button
                      onClick={() => pendingQ.length && setShowApproveAllModal(true)}
                      disabled={approvingAll || pendingQ.length === 0}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm ${
                        approvingAll || pendingQ.length === 0
                          ? 'bg-emerald-300 text-white cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      <CheckCircle2 size={16} /> Aceptar todas
                    </button>
                  </div>
                </div>

                {pendingQ.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
                    No hay preguntas pendientes.
                  </div>
                ) : (
                  pendingQ.map((q) => {
                    const opts = q.options ?? [];
                    const correct = Math.min(Math.max(q.correctIndex ?? 0, 0), Math.max(0, opts.length - 1));
                    const hasImage = Boolean(q.diagram?.path);

                    return (
                      <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                        {/* Imagen grande primero en móvil */}
                        {hasImage && (
                          <div className="md:hidden mb-3">
                            <img
                              src={q.diagram!.path!}
                              alt={q.diagram?.title || 'Diagrama'}
                              title="Toca para ampliar"
                              className="w-full max-h-64 object-contain rounded-xl border bg-white"
                              onClick={() =>
                                setLightbox({
                                  src: q.diagram!.path!,
                                  title: q.diagram?.title,
                                })
                              }
                            />
                          </div>
                        )}

                      {/* Cabecera con título del diagrama y autor */}
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Diagrama</div>
                          <div className="text-base font-semibold">{q.diagram?.title?.trim() || 'Sin título'}</div>
                          <div className="mt-2 text-sm text-gray-600 inline-flex items-center gap-2">
                            <UserIcon size={16} />
                            <span>
                              Creada por:{' '}
                              <strong>{joinName(q.creator?.name, (q as any).creator?.lastName)}</strong>
                            </span>
                            {q.creator?.email && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Mail size={14} />
                                {q.creator.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Miniatura / botón ampliar SOLO desktop */}
                        <div className="hidden md:flex items-center gap-2">
                          {hasImage ? (
                            <button
                              onClick={() =>
                                setLightbox({
                                  src: q.diagram!.path!,
                                  title: q.diagram?.title,
                                })
                              }
                              className="group"
                              title="Haz clic para ampliar"
                            >
                              <img
                                src={q.diagram!.path!}
                                alt={q.diagram?.title || 'Diagrama'}
                                className="h-16 w-16 rounded border object-cover group-hover:opacity-90"
                              />
                              <div className="mt-1 text-center text-xs text-gray-500">Ampliar</div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <ImageIcon size={16} /> Sin imagen
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-500">Enunciado</div>
                        <ExpandableText text={q.prompt} clamp={260} className="mt-1 text-gray-800" />
                      </div>

                      <div className="mt-3">
                        <div className="text-sm text-gray-500">Pista</div>
                        <ExpandableText text={q.hint || '—'} clamp={220} className="mt-1 italic text-gray-700" />
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-500 mb-1">Opciones</div>
                        <div className="space-y-1">
                          {(opts.length ? opts : ['(sin opciones)']).map((opt, idx) => {
                            const isCorrect = idx === correct;
                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border px-3 py-2 text-sm ${
                                  isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                                }`}
                              >
                                <span className="font-medium mr-2">{letter(idx)}.</span>
                                <ExpandableText text={opt} clamp={140} inline />
                                {isCorrect && (
                                  <span className="ml-2 inline-flex items-center text-emerald-700">
                                    <CheckCircle2 size={16} className="mr-1" />
                                    Correcta (propuesta)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                        <details className="w-full md:w-auto">
                          <summary className="cursor-pointer text-sm text-gray-600">Añadir comentario al rechazar (opcional)</summary>
                          <textarea
                            id={`q-comment-${q.id}`}
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Explica brevemente tu decisión…"
                            onChange={(e) => setHasTypedComment((prev) => prev || e.target.value.trim().length > 0)}
                          />
                        </details>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const el = document.getElementById(`q-comment-${q.id}`) as HTMLTextAreaElement | null;
                              onDecideQuestion(q, 'reject', el?.value?.trim() || undefined);
                            }}
                            disabled={qSubmitting === q.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                              qSubmitting === q.id
                                ? 'bg-rose-300 cursor-not-allowed text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            <XCircle size={16} />
                            Rechazar
                          </button>

                          <button
                            onClick={() => {
                              const el = document.getElementById(`q-comment-${q.id}`) as HTMLTextAreaElement | null;
                              onDecideQuestion(q, 'approve', el?.value?.trim() || undefined);
                            }}
                            disabled={qSubmitting === q.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                              qSubmitting === q.id
                                ? 'bg-emerald-300 cursor-not-allowed text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            <CheckCircle2 size={16} />
                            Aprobar
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* RECLAMACIONES */}
        {tab === 'claims' && (
          <>
            {cShowLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Cargando…</div>
            ) : pendingC.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
                No hay reclamaciones pendientes.
              </div>
            ) : (
              <div className="space-y-5">
                {pendingC.map((c) => {
                  const opts = c.options ?? [];
                  const hasImage = Boolean(c.diagram?.path);

                  return (
                    <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                      {/* Imagen grande primero en móvil */}
                      {hasImage && (
                        <div className="md:hidden mb-3">
                          <img
                            src={c.diagram!.path!}
                            alt={c.diagram?.title || 'Diagrama'}
                            title="Toca para ampliar"
                            className="w-full max-h-64 object-contain rounded-xl border bg-white"
                            onClick={() =>
                              setLightbox({
                                src: c.diagram!.path!,
                                title: c.diagram?.title,
                              })
                            }
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Diagrama</div>
                          <div className="text-base font-semibold">{c.diagram?.title?.trim() || 'Sin título'}</div>

                          <div className="mt-2 text-sm text-gray-600 inline-flex items-center gap-2">
                            <UserIcon size={16} />
                            <span>
                              Reclamada por:{' '}
                              <strong>{joinName(c.reporter?.name, (c as any).reporter?.lastName)}</strong>
                            </span>
                            {c.reporter?.email && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Mail size={14} />
                                {c.reporter.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Miniatura / botón ampliar SOLO desktop */}
                        <div className="hidden md:flex items-center gap-2">
                          {hasImage ? (
                            <button
                              onClick={() =>
                                setLightbox({
                                  src: c.diagram!.path!,
                                  title: c.diagram?.title,
                                })
                              }
                              className="group"
                              title="Haz clic para ampliar"
                            >
                              <img
                                src={c.diagram!.path!}
                                alt={c.diagram?.title || 'Diagrama'}
                                className="h-16 w-16 rounded border object-cover group-hover:opacity-90"
                              />
                              <div className="mt-1 text-center text-xs text-gray-500">Ampliar</div>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <ImageIcon size={16} /> Sin imagen
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-500">Pregunta</div>
                        <ExpandableText text={c.question?.prompt || '—'} clamp={260} className="mt-1 text-gray-800" />
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-500 mb-1">Opciones:</div>
                        <div className="space-y-1">
                          {(opts.length ? opts : ['(sin opciones)']).map((opt, idx) => {
                            const isCorrect = idx === (c.correctIndex ?? -1);
                            const isChosen = idx === (c.chosenIndex ?? -2);
                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border px-3 py-2 text-sm ${
                                  isCorrect
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : isChosen
                                    ? 'border-indigo-300 bg-indigo-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <span className="font-medium mr-2">{letter(idx)}.</span>
                                <ExpandableText text={opt} clamp={140} inline />
                                {isCorrect && (
                                  <span className="ml-2 inline-flex items-center text-emerald-700">
                                    <CheckCircle2 size={16} className="mr-1" />
                                    Correcta (test)
                                  </span>
                                )}
                                {isChosen && !isCorrect && (
                                  <span className="ml-2 inline-flex items-center text-indigo-700">• Elegida por el alumno</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-500">Argumento del alumno</div>
                        <ExpandableText
                          text={c.explanation?.trim() || '—'}
                          clamp={260}
                          className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
                        />
                      </div>

                      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                        <details className="w-full md:w-auto">
                          <summary className="cursor-pointer text-sm text-gray-600">
                            Añadir comentario al alumno (opcional)
                          </summary>
                          <textarea
                            id={`c-comment-${c.id}`}
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Explica brevemente tu decisión…"
                            onChange={(e) => setHasTypedComment((prev) => prev || e.target.value.trim().length > 0)}
                          />
                        </details>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              openClaimModal(c, 'reject');
                            }}
                            disabled={cSubmitting === c.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                              cSubmitting === c.id
                                ? 'bg-rose-300 cursor-not-allowed text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            <XCircle size={16} />
                            Rechazar
                          </button>

                          <button
                            onClick={() => {
                              openClaimModal(c, 'approve');
                            }}
                            disabled={cSubmitting === c.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                              cSubmitting === c.id
                                ? 'bg-emerald-300 cursor-not-allowed text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            <CheckCircle2 size={16} />
                            Aprobar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showApproveAllModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              if (!approvingAll) setShowApproveAllModal(false);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900">Aprobar todas las preguntas</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                Se aprobarán todas las preguntas nuevas pendientes. ¿Deseas continuar?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowApproveAllModal(false)}
                  disabled={approvingAll}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={approveAllQuestions}
                  disabled={approvingAll}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white ${
                    approvingAll
                      ? 'bg-emerald-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <CheckCircle2 size={16} /> Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {claimModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              if (!cSubmitting) setClaimModal(null);
            }}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900">Confirmar revisión</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                {claimModal.decision === 'approve'
                  ? 'Se aprobarán todas las reclamaciones que propongan la misma solución.'
                  : 'Puedes rechazar solo esta reclamación o también las que eligieron la misma opción en la pregunta.'}
              </p>

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                <div className="text-gray-500 text-xs uppercase tracking-wide">Pregunta</div>
                <div className="mt-1 font-medium text-gray-900 whitespace-pre-wrap break-words">
                  {claimModal.claim.question?.prompt || 'Sin enunciado'}
                </div>
              </div>

              {claimModal.decision === 'approve' && (
                <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={Boolean(claimModal.rejectOtherSolutions)}
                    onChange={(e) =>
                      setClaimModal((prev) =>
                        prev ? { ...prev, rejectOtherSolutions: e.target.checked } : prev
                      )
                    }
                  />
                  <span>
                    <strong>Rechazar automáticamente las reclamaciones con otra solución.</strong>
                    <br />
                    <span className="text-gray-600">Se enviará el rechazo con motivo vacío.</span>
                  </span>
                </label>
              )}

              {claimModal.decision === 'reject' && (
                <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={claimModal.rejectSameSolution !== false}
                    onChange={(e) =>
                      setClaimModal((prev) =>
                        prev ? { ...prev, rejectSameSolution: e.target.checked } : prev
                      )
                    }
                  />
                  <span>
                    <strong>Rechazar también las reclamaciones con la misma opción elegida.</strong>
                    <br />
                    <span className="text-gray-600">Si se desmarca, solo se rechaza la reclamación seleccionada.</span>
                  </span>
                </label>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setClaimModal(null)}
                  disabled={cSubmitting === claimModal.claim.id}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitClaimDecision(claimModal)}
                  disabled={cSubmitting === claimModal.claim.id}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white ${
                    cSubmitting === claimModal.claim.id
                      ? 'bg-indigo-300 cursor-not-allowed'
                      : claimModal.decision === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {claimModal.decision === 'approve' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {claimModal.decision === 'approve' ? 'Aprobar reclamación' : 'Rechazar reclamación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setLightbox(null)}
          >
            <div className="max-h-[90vh] max-w-5xl">
              <img
                src={lightbox.src}
                alt={lightbox.title || 'Diagrama'}
                className="max-h-[90vh] w-auto rounded-lg shadow-2xl"
              />
              {lightbox.title && (
                <div className="mt-3 text-center text-sm text-white/90">{lightbox.title}</div>
              )}
            </div>
          </div>
        )}
      </div>
   </PageWithHeader>
  );
};

export default VerifyQuestions;
