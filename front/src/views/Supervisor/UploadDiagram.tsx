// src/views/UploadDiagram.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWithHeader from "../../components/layout/PageWithHeader";
import { uploadDiagram } from "../../services/diagrams";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Minus,
  ArrowLeft,
} from "lucide-react";

type QuestionForm = {
  prompt: string;
  options: string[]; // >= 2
  correctIndex: number; // 0..n-1
  hint: string; // obligatorio
  errors?: {
    prompt?: string;
    options?: string[]; // por opción
    optionsGeneral?: string; // mínimo 2
    correctIndex?: string;
    hint?: string;
  };
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

const emptyQuestion = (): QuestionForm => ({
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
  hint: "",
});

const UploadDiagram: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // snapshot para detectar cambios
  const initialSnapRef = useRef<string>("");

  useEffect(() => {
    // snapshot inicial (form vacío)
    initialSnapRef.current = JSON.stringify({
      title: "",
      hasFile: false,
      questions: [emptyQuestion()],
    });
  }, []);

  const imagePreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  const currentSnap = useMemo(
    () => JSON.stringify({ title, hasFile: !!file, questions }),
    [title, file, questions]
  );
  const isDirty = currentSnap !== initialSnapRef.current;

  const onFileChange = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      toast.error("Formato inválido. Sube un JPG o PNG.");
      return;
    }
    setFile(f);
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, patch: Partial<QuestionForm>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx || q.options.length >= MAX_OPTIONS) return q;
        return { ...q, options: [...q.options, ""] };
      })
    );
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx || q.options.length <= MIN_OPTIONS) return q;

        // Reajustar correcta si procede
        let newCorrect = q.correctIndex;
        if (optIdx === q.correctIndex) newCorrect = 0;
        else if (optIdx < q.correctIndex) newCorrect = q.correctIndex - 1;

        const options = q.options.filter((_, k) => k !== optIdx);
        return { ...q, options, correctIndex: newCorrect };
      })
    );
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...q.options];
        options[optIdx] = value;
        return { ...q, options };
      })
    );
  };

  // Valida y pinta errores en el formulario
  const validate = (): boolean => {
    let ok = true;
    const next = questions.map((q) => {
      const e: QuestionForm["errors"] = {};

      if (!title.trim()) ok = false;
      if (!file) ok = false;

      if (!q.prompt.trim()) e.prompt = "Enunciado obligatorio";
      if (q.options.length < MIN_OPTIONS)
        e.optionsGeneral = `Mínimo ${MIN_OPTIONS} opciones`;
      const optsErr = q.options.map((o) => (!o.trim() ? "Requerida" : ""));
      if (optsErr.some(Boolean)) e.options = optsErr;
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        e.correctIndex = "Selecciona la opción correcta";
      }
      if (!q.hint.trim()) e.hint = "La pista es obligatoria";

      if (
        e.prompt ||
        e.optionsGeneral ||
        e.correctIndex ||
        e.hint ||
        (e.options && e.options.some(Boolean))
      ) {
        ok = false;
      }
      return { ...q, errors: e };
    });

    setQuestions(next);

    if (!ok) {
      toast.error("Rellena todos los campos obligatorios.");
    }
    return ok;
  };

  // Solo para estilo/estado del botón (no pinta errores)
  const canSubmit = useMemo(() => {
    if (!title.trim() || !file) return false;
    for (const q of questions) {
      if (!q.prompt.trim()) return false;
      if (!q.hint.trim()) return false;
      if (!q.options || q.options.length < MIN_OPTIONS) return false;
      if (q.options.some((o) => !o.trim())) return false;
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length)
        return false;
    }
    return true;
  }, [title, file, questions]);

  const goBack = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
      return;
    }
    navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // aunque el botón parezca desactivado, aquí hacemos guardado defensivo + toast
    if (!validate() || !file) return;

    setSubmitting(true);
    try {
      await uploadDiagram({
        title: title.trim(),
        imageFile: file,
        questions: questions.map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
          hint: q.hint.trim(),
        })),
      });

      toast.success("Diagrama subido correctamente");
      // reset
      setTitle("");
      setFile(null);
      setQuestions([emptyQuestion()]);
      // reset snapshot para evitar aviso al salir
      initialSnapRef.current = JSON.stringify({
        title: "",
        hasFile: false,
        questions: [emptyQuestion()],
      });
      navigate("/supervisor/tests", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "No se pudo subir el diagrama");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
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

        <h1 className="text-2xl font-semibold mb-2">Subir diagrama</h1>
        <p className="text-gray-600 mb-6">
          Sube una imagen (JPG o PNG) y añade preguntas (mínimo 2 opciones, una
          correcta y pista).
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del diagrama */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Título *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Modelo ER de Biblioteca"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Imagen (JPG o PNG) *
                </label>
                <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />
                  <ImageIcon size={18} />
                  {file ? (
                    <span>{file.name}</span>
                  ) : (
                    <span>Seleccionar archivo</span>
                  )}
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Tamaño recomendado: 5MB
                </p>
              </div>
            </div>

            {/* Vista previa centrada */}
            {imagePreview && (
              <div className="mt-4 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="max-h-64 rounded-lg border border-gray-200 object-contain"
                />
              </div>
            )}
          </div>

          {/* Preguntas */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Preguntas</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Plus size={16} /> Añadir pregunta
              </button>
            </div>

            {questions.map((q, idx) => (
              <div
                key={idx}
                className="mb-6 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">
                    Pregunta #{idx + 1}
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Enunciado */}
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-1">
                    Enunciado *
                  </label>
                  <textarea
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(idx, { prompt: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                      q.errors?.prompt ? "border-red-400" : "border-gray-300"
                    }`}
                    rows={2}
                    placeholder="¿Qué representa la entidad ...?"
                  />
                  {q.errors?.prompt && (
                    <p className="mt-1 text-xs text-red-600">
                      {q.errors.prompt}
                    </p>
                  )}
                </div>

                {/* Opciones */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm text-gray-600">
                      Opciones *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addOption(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                        disabled={q.options.length >= MAX_OPTIONS}
                        title="Añadir opción"
                      >
                        <Plus size={14} /> Opción
                      </button>
                    </div>
                  </div>
                  {q.errors?.optionsGeneral && (
                    <p className="mt-1 text-xs text-red-600">
                      {q.errors.optionsGeneral}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="relative">
                        <label className="block text-xs text-gray-500 mb-1">
                          Opción {optIdx + 1}
                        </label>
                        <input
                          value={opt}
                          onChange={(e) =>
                            updateOption(idx, optIdx, e.target.value)
                          }
                          className={`w-full rounded-lg border px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            q.errors?.options?.[optIdx]
                              ? "border-red-400"
                              : "border-gray-300"
                          }`}
                          placeholder={`Texto de la opción ${optIdx + 1}`}
                        />
                        <div className="absolute right-2 top-[28px] flex items-center gap-2">
                          {/* Selector de correcta */}
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() =>
                              updateQuestion(idx, { correctIndex: optIdx })
                            }
                            title="Marcar como correcta"
                          />
                          {/* Eliminar opción */}
                          <button
                            type="button"
                            onClick={() => removeOption(idx, optIdx)}
                            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            disabled={q.options.length <= MIN_OPTIONS}
                            title="Eliminar opción"
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                        {q.errors?.options?.[optIdx] && (
                          <p className="mt-1 text-xs text-red-600">
                            {q.errors.options[optIdx]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.errors?.correctIndex && (
                    <p className="mt-2 text-xs text-red-600">
                      {q.errors.correctIndex}
                    </p>
                  )}
                </div>

                {/* Pista OBLIGATORIA */}
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Pista *
                  </label>
                  <input
                    value={q.hint}
                    onChange={(e) =>
                      updateQuestion(idx, { hint: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                      q.errors?.hint ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="Recuerda revisar las cardinalidades..."
                  />
                  {q.errors?.hint && (
                    <p className="mt-1 text-xs text-red-600">{q.errors.hint}</p>
                  )}
                </div>
                {/* Acciones al final de la pregunta */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <Plus size={16} /> Añadir pregunta
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
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
              aria-disabled={!canSubmit}
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white transition
                ${
                  submitting
                    ? "bg-indigo-400 cursor-not-allowed"
                    : canSubmit
                    ? "bg-indigo-600 hover:bg-indigo-500"
                    : "bg-indigo-300 cursor-not-allowed"
                }
              `}
              onClick={(e) => {
                // Si el formulario no está listo, evitamos submit y mostramos toast
                if (!canSubmit) {
                  e.preventDefault();
                  validate(); // pinta errores
                }
              }}
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8v4l3.464-3.464A12 12 0 004 12z"
                      fill="currentColor"
                      className="opacity-75"
                    />
                  </svg>
                  Subiendo…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Subir diagrama
                </>
              )}
            </button>
          </div>
        </form>
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
                  onClick={() => navigate(-1)}
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

export default UploadDiagram;
