import React, { useEffect, useMemo, useState, useEffect as ReactUseEffect } from 'react';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { fetchStudents, updateStudent, deleteStudent, type StudentSummary } from '../../services/users';
import { toast } from 'react-toastify';
import { Pencil, Trash2, Search, X, AlertTriangle, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type EditForm = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password: string; 
};

const PAGE_SIZE = 20; 

const SupervisorStudents: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  
  const [confirmDelete, setConfirmDelete] = useState<StudentSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchStudents();
        setStudents(data);
      } catch (e: any) {
        toast.error(e.message || 'Error cargando alumnos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return students;
    return students.filter(s => {
      const full = normalize(`${s.name} ${s.lastName}`);
      return full.includes(q) || normalize(s.email).includes(q);
    });
  }, [students, query]);

  
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, students]);

  
  const openEdit = (s: StudentSummary) => {
    const base: EditForm = {
      id: s.id,
      name: s.name || '',
      lastName: s.lastName || '',
      email: s.email,
      password: '',
    };
    setEditing(base);
    setEditingOriginal(base);
  };

  const isEditDirty =
    !!editing &&
    !!editingOriginal &&
    (
      editing.name !== editingOriginal.name ||
      editing.lastName !== editingOriginal.lastName ||
      editing.email !== editingOriginal.email ||
      editing.password.trim() !== ''
    );

  const closeEdit = () => {
    if (isEditDirty && !window.confirm('Hay cambios sin guardar. ¿Seguro que deseas salir?')) return;
    setEditing(null);
    setEditingOriginal(null);
  };

  
  ReactUseEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    if (editing && isEditDirty) window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [editing, isEditDirty]);

  
  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.lastName.trim() || !editing.email.trim()) {
      toast.error('Nombre, apellidos y email son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const dto: any = {
        name: editing.name.trim(),
        lastName: editing.lastName.trim(),
        email: editing.email.trim(),
      };
      if (editing.password.trim()) dto.password = editing.password;

      const updated = await updateStudent(editing.id, dto);
      setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      toast.success('Alumno actualizado');
      setEditing(null);
      setEditingOriginal(null);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  
  const confirmDeleteNow = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteStudent(confirmDelete.id);
      setStudents(prev => prev.filter(st => st.id !== confirmDelete.id));
      toast.success('Alumno eliminado');
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-6xl p-6">
        {/* Volver */}
        <div className="mb-3">
          <button
            onClick={() => {
              if (editing && isEditDirty && !window.confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return;
              navigate("/supervisor/dashboard");
            }}
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-2 hover:bg-gray-50"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gestionar alumnos</h1>
            <p className="text-gray-600">Edita datos o da de baja alumnos.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, apellidos o email…"
              className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Tabla (responsive) */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Cabecera SOLO en desktop */}
          <div className="hidden md:grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-3">Apellidos</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {loading ? (
            <div className="p-6 text-gray-500">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-gray-500">No hay alumnos que coincidan con el filtro.</div>
          ) : (
            <>
              <div className="divide-y">
                {filtered.slice(0, visibleCount).map((s) => {
                  const fullName = `${s.name || ''} ${s.lastName || ''}`.trim();
                  return (
                    <div key={s.id} className="px-4 py-3">
                      {/* Fila desktop */}
                      <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 min-w-0">
                          <div className="truncate" title={s.name}>{s.name}</div>
                        </div>
                        <div className="col-span-3 min-w-0">
                          <div className="truncate" title={s.lastName}>{s.lastName}</div>
                        </div>
                        <div className="col-span-4 min-w-0">
                          <div className="truncate" title={s.email}>{s.email}</div>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/supervisor/students/${s.id}`)}
                            className="rounded-lg px-2 py-1 text-sky-700 hover:bg-sky-50"
                            title="Ver progreso y actividad"
                            aria-label="Ver progreso y actividad"
                          >
                            <BarChart3 size={18} />
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-lg px-2 py-1 text-indigo-700 hover:bg-indigo-50"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(s)}
                            className="rounded-lg px-2 py-1 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            title="Eliminar"
                            disabled={deletingId === s.id}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Tarjeta móvil */}
                      <div className="md:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium break-words">{fullName || '—'}</div>
                            <div className="text-xs text-gray-500 break-words">{s.email}</div>
                          </div>
                          <div className="shrink-0 flex gap-1">
                            <button
                              onClick={() => navigate(`/supervisor/students/${s.id}`)}
                              className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-50"
                              title="Ver progreso y actividad"
                              aria-label="Ver progreso y actividad"
                            >
                              <BarChart3 size={18} />
                            </button>
                            <button
                              onClick={() => openEdit(s)}
                              className="rounded-lg p-1.5 text-indigo-700 hover:bg-indigo-50"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(s)}
                              className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              title="Eliminar"
                              aria-label="Eliminar"
                              disabled={deletingId === s.id}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer paginado ⬇️ */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">
                  Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length}
                </span>
                {visibleCount < filtered.length ? (
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cargar más
                  </button>
                ) : (
                  <span className="text-xs text-gray-400"></span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal edición */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-lg font-semibold">Editar alumno</h3>
                <button
                  onClick={closeEdit}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Nombre *
                    </label>
                    <input
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Apellidos *
                    </label>
                    <input
                      value={editing.lastName}
                      onChange={(e) =>
                        setEditing({ ...editing, lastName: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editing.email}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Contraseña (dejar vacío para no cambiar)
                  </label>
                  <input
                    type="password"
                    value={editing.password}
                    onChange={(e) =>
                      setEditing({ ...editing, password: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
                <button
                  onClick={closeEdit}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`rounded-xl px-5 py-2 text-sm font-medium text-white ${
                    saving
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmación de borrado */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            >
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-lg font-semibold">Eliminar alumno</h3>
              </div>

              <div className="px-6 py-5 space-y-3">
                <p className="text-gray-700">
                  ¿Seguro que quieres eliminar a{' '}
                  <strong>
                    {confirmDelete.name} {confirmDelete.lastName}
                  </strong>{' '}
                  ({confirmDelete.email})?
                </p>
                <p className="text-sm text-gray-500">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  disabled={!!deletingId}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteNow}
                  disabled={deletingId === confirmDelete.id}
                  className={`rounded-xl px-5 py-2 text-sm font-medium text-white ${
                    deletingId === confirmDelete.id
                      ? 'bg-rose-400 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {deletingId === confirmDelete.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   </PageWithHeader>
  );
};

export default SupervisorStudents;
