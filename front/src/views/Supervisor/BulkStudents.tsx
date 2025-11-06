import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchCreateStudents, type BatchStudent } from '../../services/users';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { toast } from 'react-toastify';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

type Row = {
  key: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  errors?: { name?: string; lastName?: string; email?: string; password?: string };
};

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SupervisorBulkStudents: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([
    { key: crypto.randomUUID(), name: '', lastName: '', email: '', password: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addRow = () => {
    setRows(prev => [...prev, { key: crypto.randomUUID(), name: '', lastName: '', email: '', password: '' }]);
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const updateCell = (key: string, field: keyof Row, value: string) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const validate = (draft: Row[]) => {
    const emails = draft.map(r => r.email.trim().toLowerCase()).filter(Boolean);
    const dupes = new Set(emails.filter((e, i) => emails.indexOf(e) !== i));

    return draft.map(r => {
      const errs: Row['errors'] = {};

      if (r.email && !emailRx.test(r.email)) errs.email = 'Email inválido';
      if (dupes.has(r.email.trim().toLowerCase())) errs.email = 'Email duplicado';

      if (!r.password || r.password.length < 6) errs.password = 'Mínimo 6 caracteres';

      return { ...r, errors: errs };
    });
  };

  const validatedRows = useMemo(() => validate(rows), [rows]);
  const hasErrors = validatedRows.some(r => r.errors && Object.keys(r.errors).length > 0);
  const allEmpty = rows.every(r => !r.name && !r.lastName && !r.email && !r.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const checked = validate(rows);
    setRows(checked);

    const allEmpty = checked.every(r => !r.name && !r.lastName && !r.email && !r.password);
    const hasErrors = checked.some(r => r.errors && Object.keys(r.errors).length > 0);

    if (allEmpty) {
      toast.info('Añade al menos un alumno.');
      return;
    }
    if (hasErrors) {
      toast.error('Revisa los errores antes de guardar.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: BatchStudent[] = checked.map(r => ({
        name: r.name.trim(),
        lastName: r.lastName.trim(),
        email: r.email.trim(),
        password: r.password,
      }));

      const result = await batchCreateStudents(payload);
      const creados = result.created.length;
      const yaExisten = result.skipped.exists?.length || 0;
      const duplicados = result.skipped.payloadDuplicates?.length || 0;

      if (creados > 0) toast.success(`Registrados ${creados} alumno(s) correctamente.`);
      if (yaExisten > 0) toast.warn(`Omitidos por existir previamente: ${result.skipped.exists.join(', ')}`);
      if (duplicados > 0) toast.warn(`Omitidos por duplicados en el lote: ${result.skipped.payloadDuplicates.join(', ')}`);

      setRows([{ key: crypto.randomUUID(), name: '', lastName: '', email: '', password: '' }]);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo completar el alta masiva');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Header con Arrow Left */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/supervisor/dashboard')}
              className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50"
              aria-label="Volver"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Alta masiva de alumnos</h1>
              <p className="text-gray-600">
                Rellena los campos solicitados. Puedes añadir varias filas y guardar todas de una vez.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* Cabecera SOLO desktop */}
            <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
              <div className="col-span-3">Nombre *</div>
              <div className="col-span-3">Apellidos *</div>
              <div className="col-span-3">Email *</div>
              <div className="col-span-2">Contraseña *</div>
              <div className="col-span-1 text-right">Acciones</div>
            </div>

            <div className="divide-y">
              {validatedRows.map(r => (
                <div key={r.key} className="px-4 py-4">
                  {/* Fila desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-3">
                      <input
                        value={r.name}
                        onChange={e => updateCell(r.key, 'name', e.target.value)}
                        placeholder="Nombre"
                        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                          r.errors?.name ? 'border-red-400' : 'border-gray-300'
                        }`}
                        required
                      />
                      {r.errors?.name && <p className="mt-1 text-xs text-red-600">{r.errors.name}</p>}
                    </div>

                    <div className="col-span-3">
                      <input
                        value={r.lastName}
                        onChange={e => updateCell(r.key, 'lastName', e.target.value)}
                        placeholder="Apellidos"
                        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                          r.errors?.lastName ? 'border-red-400' : 'border-gray-300'
                        }`}
                        required
                      />
                      {r.errors?.lastName && <p className="mt-1 text-xs text-red-600">{r.errors.lastName}</p>}
                    </div>

                    <div className="col-span-3">
                      <input
                        value={r.email}
                        onChange={e => updateCell(r.key, 'email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                          r.errors?.email ? 'border-red-400' : 'border-gray-300'
                        }`}
                        type="email"
                        required
                      />
                      {r.errors?.email && <p className="mt-1 text-xs text-red-600">{r.errors.email}</p>}
                    </div>

                    <div className="col-span-2">
                      <input
                        value={r.password}
                        onChange={e => updateCell(r.key, 'password', e.target.value)}
                        placeholder="Contraseña"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        type="password"
                        required
                      />
                      {r.errors?.password && (
                        <p className="mt-1 text-xs text-gray-600">{r.errors.password}</p>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                        title="Eliminar fila"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta móvil */}
                  <div className="md:hidden rounded-xl   bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Alumno</div>
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
                        title="Eliminar fila"
                        aria-label="Eliminar fila"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Nombre *</label>
                        <input
                          value={r.name}
                          onChange={e => updateCell(r.key, 'name', e.target.value)}
                          placeholder="Nombre"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.name ? 'border-red-400' : 'border-gray-300'
                          }`}
                          required
                        />
                        {r.errors?.name && <p className="mt-1 text-xs text-red-600">{r.errors.name}</p>}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Apellidos *</label>
                        <input
                          value={r.lastName}
                          onChange={e => updateCell(r.key, 'lastName', e.target.value)}
                          placeholder="Apellidos"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.lastName ? 'border-red-400' : 'border-gray-300'
                          }`}
                          required
                        />
                        {r.errors?.lastName && <p className="mt-1 text-xs text-red-600">{r.errors.lastName}</p>}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Email *</label>
                        <input
                          value={r.email}
                          onChange={e => updateCell(r.key, 'email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                            r.errors?.email ? 'border-red-400' : 'border-gray-300'
                          }`}
                          type="email"
                          required
                        />
                        {r.errors?.email && <p className="mt-1 text-xs text-red-600">{r.errors.email}</p>}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Contraseña *</label>
                        <input
                          value={r.password}
                          onChange={e => updateCell(r.key, 'password', e.target.value)}
                          placeholder="Contraseña"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          type="password"
                          required
                        />
                        {r.errors?.password && (
                          <p className="mt-1 text-xs text-gray-600">{r.errors.password}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones (responsive) */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Plus size={18} />
              Añadir fila
            </button>

            <button
              type="submit"
              disabled={submitting || hasErrors || allEmpty}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white ${
                submitting || hasErrors || allEmpty
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {submitting ? (
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
                  Guardar todo
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          Consejo: puedes rellenar unas cuantas filas y guardar, luego volver a añadir más.
        </p>
      </div>
   </PageWithHeader>
  );
};

export default SupervisorBulkStudents;
