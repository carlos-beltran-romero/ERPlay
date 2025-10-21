// src/views/EditDiagram.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageWithHeader from '../PageWithHeader';
import { toast } from 'react-toastify';
import { getDiagram, updateDiagram } from '../../services/diagrams';
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';

type QuestionForm = {
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
};

const EditDiagram: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // snapshot para detectar cambios
  const initialSnapRef = useRef<string>('');

  // Cargar datos
  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error('Falta id');
        const d = await getDiagram(id);
        setTitle(d.title || '');
        setImagePreview(d.path || '');
        const qNorm = (d.questions || []).map((q: any) => ({
          prompt: q.prompt || '',
          hint: q.hint || '',
          options: Array.isArray(q.options) ? q.options : [],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        }));
        setQuestions(qNorm);

        initialSnapRef.current = JSON.stringify({ title: d.title || '', questions: qNorm, hasFile: false });
      } catch (e: any) {
        toast.error(e.message || 'No se pudo cargar el test');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const currentSnap = useMemo(
    () => JSON.stringify({ title, questions, hasFile: !!imageFile }),
    [title, questions, imageFile]
  );
  const isDirty = currentSnap !== initialSnapRef.current;

  // Aviso al cerrar/reload pestaña si hay cambios
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Handlers imagen
  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  // Helpers preguntas/opciones
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { prompt: '', hint: '', options: ['', ''], correctIndex: 0 },
    ]);
  };

  const removeQuestion = (qi: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== qi));
  };

  const setQuestionField = (qi: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));
  };

  const addOption = (qi: number) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, ''] } : q
      )
    );
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const opts = q.options.filter((_, idx) => idx !== oi);
        let correct = q.correctIndex;
        if (oi === q.correctIndex) correct = 0;
        else if (oi < q.correctIndex) correct = Math.max(0, correct - 1);
        return { ...q, options: opts.length ? opts : ['',''], correctIndex: Math.min(correct, Math.max(0, opts.length - 1)) };
      })
    );
  };

  const setOption = (qi: number, oi: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const opts = q.options.slice();
        opts[oi] = value;
        return { ...q, options: opts };
      })
    );
  };

  const setCorrect = (qi: number, oi: number) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === qi ? { ...q, correctIndex: oi } : q))
    );
  };

  // Validación
  const validation = useMemo(() => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('El título es obligatorio.');
    if (!questions.length) errs.push('Debes incluir al menos 1 pregunta.');
    questions.forEach((q, i) => {
      if (!q.prompt.trim()) errs.push(`Pregunta ${i + 1}: el enunciado es obligatorio.`);
      if (!q.hint.trim()) errs.push(`Pregunta ${i + 1}: la pista es obligatoria.`);
      const nonEmpty = q.options.filter(o => o.trim().length > 0);
      if (nonEmpty.length < 2) errs.push(`Pregunta ${i + 1}: mínimo 2 opciones no vacías.`);
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        errs.push(`Pregunta ${i + 1}: índice de opción correcta inválido.`);
      } else if (!q.options[q.correctIndex]?.trim()) {
        errs.push(`Pregunta ${i + 1}: la opción marcada como correcta está vacía.`);
      }
    });
    return { ok: errs.length === 0, errs };
  }, [title, questions]);

  const goBack = () => {
    if (isDirty && !window.confirm('¿Estás seguro que deseas salir sin guardar los cambios?')) return;
    navigate(-1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.ok) {
      toast.error('Revisa los errores antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      if (!id) throw new Error('Falta id');

      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append(
        'questions',
        JSON.stringify(
          questions.map(q => ({
            prompt: q.prompt.trim(),
            hint: q.hint.trim(),
            options: q.options.map(o => o.trim()),
            correctIndex: q.correctIndex,
          }))
        )
      );
      if (imageFile) {
        fd.append('image', imageFile);
      }

      await updateDiagram(id, fd);
      toast.success('Test actualizado');
      navigate('/supervisor/tests', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar el test');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWithHeader>
        <div className="p-6 text-gray-600">Cargando…</div>
      </PageWithHeader>
    );
  }

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
        {/* Volver */}
        <div className="mb-4">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Volver"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>

        <h1 className="text-2xl font-semibold mb-6">Editar test</h1>

        {/* Título */}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Título *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Introduce el título del test"
          />
        </div>

        {/* Imagen */}
        <div className="mb-8">
          <label className="block text-sm text-gray-600 mb-2">Imagen del diagrama</label>

          <div className="flex flex-col items-center gap-4">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="preview"
                className="max-h-80 rounded-lg border object-contain"
              />
            ) : (
              <div className="h-40 w-full max-w-md flex items-center justify-center rounded-lg border border-dashed text-gray-500">
                Sin imagen
              </div>
            )}

            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
              <ImageIcon size={18} />
              Reemplazar imagen
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onPickImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* Preguntas */}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-6">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold">Pregunta {qi + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="text-rose-700 hover:bg-rose-50 rounded-lg px-2 py-1"
                    title="Eliminar pregunta"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Enunciado *</label>
                    <textarea
                      value={q.prompt}
                      onChange={e => setQuestionField(qi, 'prompt', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24 resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pista *</label>
                    <textarea
                      value={q.hint}
                      onChange={e => setQuestionField(qi, 'hint', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24 resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm text-gray-600">Opciones (mínimo 2)</div>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrect(qi, oi)}
                          className={`rounded-full p-1 ${
                            q.correctIndex === oi
                              ? 'text-emerald-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title="Marcar como correcta"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <input
                          value={opt}
                          onChange={e => setOption(qi, oi, e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder={`Opción ${oi + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qi, oi)}
                          className="rounded-lg px-2 py-1 text-rose-700 hover:bg-rose-50"
                          title="Eliminar opción"
                          disabled={q.options.length <= 2}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => addOption(qi)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Añadir opción
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Plus size={18} /> Añadir pregunta
            </button>
          </div>

          {/* Errores de validación */}
          {!validation.ok && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {validation.errs.map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm('¿Estás seguro que deseas salir sin guardar los cambios?')) return;
                navigate('/supervisor/tests');
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !validation.ok}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white ${
                saving || !validation.ok ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4l3.464-3.464A12 12 0 004 12z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PageWithHeader>
  );
};

export default EditDiagram;
