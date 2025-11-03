// src/views/NewQuestion.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Plus, Save, Search, ArrowLeft } from 'lucide-react';
import { listPublicDiagrams } from '../../services/diagrams';
import { createQuestion } from '../../services/questions';

type PublicDiagram = { id: string; title: string; path: string };

const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const NewQuestion: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Diagrama
  const [diagrams, setDiagrams] = useState<PublicDiagram[]>([]);
  const [q, setQ] = useState(''); // búsqueda por nombre
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>('');

  // Pregunta
  const [prompt, setPrompt] = useState('');
  const [hint, setHint] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);

  // Confirmación de salida sin guardar
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const initialSnapRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      try {
        const data = await listPublicDiagrams();
        setDiagrams(data);
      } catch (e: any) {
        toast.error(e.message || 'No se pudieron cargar los diagramas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Snapshot inicial del formulario vacío (para detectar cambios)
  useEffect(() => {
    initialSnapRef.current = JSON.stringify({
      diagramId: '',
      prompt: '',
      hint: '',
      options: ['', ''],
    });
  }, []);

  // Filtrado por título
  const filtered = useMemo(() => {
    const needle = normalize(q.trim());
    if (!needle) return diagrams;
    return diagrams.filter((d) => normalize(d.title).includes(needle));
  }, [diagrams, q]);

  const selectedDiagram = useMemo(
    () => diagrams.find((d) => d.id === selectedDiagramId),
    [diagrams, selectedDiagramId]
  );

  // Helpers de opciones
  const setOption = (i: number, v: string) => {
    const next = options.slice();
    next[i] = v;
    setOptions(next);
  };
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== i);
    let ci = correctIndex;
    if (i === correctIndex) ci = 0;
    else if (i < correctIndex) ci = Math.max(0, correctIndex - 1);
    setOptions(next);
    setCorrectIndex(Math.min(ci, Math.max(0, next.length - 1)));
  };

  // Validación simple
  const nonEmpty = options.map((o) => o.trim()).filter(Boolean);
  const canSave =
    !!selectedDiagramId &&
    prompt.trim().length > 0 &&
    hint.trim().length > 0 &&
    nonEmpty.length >= 2 &&
    correctIndex >= 0 &&
    correctIndex < options.length &&
    options[correctIndex].trim().length > 0;

  // Detección de cambios para el modal
  const currentSnap = useMemo(
    () =>
      JSON.stringify({
        diagramId: selectedDiagramId,
        prompt,
        hint,
        options,
      }),
    [selectedDiagramId, prompt, hint, options]
  );
  const isDirty = currentSnap !== initialSnapRef.current;

  const goBack = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
      return;
    }
    navigate(-1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      toast.error('Revisa los datos (selecciona un diagrama y completa los campos).');
      return;
    }

    try {
      setSaving(true);
      await createQuestion({
        diagramId: selectedDiagramId,
        prompt: prompt.trim(),
        hint: hint.trim(),
        options: options.map((o) => o.trim()),
        correctIndex,
      });

      // (Opcional) resetea snapshot para no avisar si el usuario permanece en la página
      initialSnapRef.current = JSON.stringify({
        diagramId: '',
        prompt: '',
        hint: '',
        options: ['', ''],
      });

      toast.success('Pregunta enviada para revisión');
      navigate('/student/questions', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear la pregunta');
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
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Header con back */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={goBack}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
              title="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Nueva pregunta</h1>
              <p className="text-gray-600">Asocia tu pregunta a un diagrama existente.</p>
            </div>
          </div>
        </div>

        {/* Selección de diagrama con búsqueda (arriba) */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm text-gray-600">Buscar diagrama por nombre</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Escribe para filtrar…"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Diagrama *</label>
                <select
                  value={selectedDiagramId}
                  onChange={(e) => setSelectedDiagramId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">— Selecciona un diagrama —</option>
                  {filtered.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>

                {q.trim() && filtered.length === 0 && (
                  <div className="mt-2 text-sm text-gray-500">Sin resultados para “{q}”.</div>
                )}
              </div>
            </div>

            {/* Breve info del seleccionado (texto) */}
            <div className="md:col-span-1">
              <div className="text-sm text-gray-600 mb-1">Seleccionado</div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-medium truncate">{selectedDiagram?.title || 'Ninguno'}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {selectedDiagram ? 'Imagen abajo ↓' : 'Elige un diagrama para ver su imagen'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Imagen grande debajo del selector */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          {selectedDiagram?.path ? (
            <>
              <div className="mb-2 text-sm font-medium text-gray-700">{selectedDiagram.title}</div>
              <div className="flex items-center justify-center">
                <img
                  src={selectedDiagram.path}
                  alt={selectedDiagram.title}
                  className="max-h-[28rem] w-full max-w-5xl rounded-lg border object-contain bg-white"
                />
              </div>
            </>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <ImageIcon size={16} /> Sin imagen
            </div>
          )}
        </div>

        {/* Formulario de la pregunta */}
        <form onSubmit={onSubmit} className="mt-5 space-y-6">
          {/* Enunciado */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block text-sm text-gray-600 mb-1">Enunciado *</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-28 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Escribe el enunciado de la pregunta…"
            />
          </div>

          {/* Opciones (arriba) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-2 text-sm text-gray-600">Opciones (mínimo 2)</div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    title="Marcar como correcta"
                  />
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={`Opción ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="rounded-lg px-2 py-1 text-rose-700 hover:bg-rose-50"
                    disabled={options.length <= 2}
                    title="Eliminar opción"
                  >
                    −
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <Plus size={16} />
                Añadir opción
              </button>
            </div>
          </div>

          {/* Pista (debajo de opciones) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="block text-sm text-gray-600 mb-1">Pista *</label>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Añade una pista útil…"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white ${
                !canSave || saving ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title={!canSave ? 'Completa todos los campos y selecciona un diagrama' : 'Crear pregunta'}
            >
              <Save size={16} />
              {saving ? 'Creando…' : 'Crear pregunta'}
            </button>
          </div>
        </form>

        {/* Modal confirmar salida sin guardar */}
        {confirmLeaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200">
              <div className="px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Salir sin guardar</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Tienes cambios sin guardar. ¿Seguro que quieres salir?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4">
                <button
                  onClick={() => setConfirmLeaveOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Seguir editando
                </button>
                <button
                  onClick={() => navigate("student/dashboard")}
                  className="rounded-xl px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500"
                >
                  Salir sin guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   </PageWithHeader>
  );
};

export default NewQuestion;
