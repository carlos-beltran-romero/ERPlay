
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageWithHeader from '../../components/layout/PageWithHeader';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getProfile,
  type UserProfile,
  updateMyProfile,
  changeMyPassword,
} from '../../services/users';
import { User, Mail, Save, Lock, ShieldCheck, Undo2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';

const MIN_PW = 6;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { setProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState(''); 
  const [email, setEmail] = useState('');

  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const initialSnapRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      try {
        const u = await getProfile();
        setMe(u);
        setProfile(u);
        setName(u.name || '');
        
        setLastName((u as any).lastName ?? (u as any).surname ?? '');
        setEmail(u.email || '');

        
        initialSnapRef.current = JSON.stringify({
          name: u.name || '',
          lastName: (u as any).lastName ?? (u as any).surname ?? '',
          email: u.email || '',
          currentPassword: '',
          newPassword: '',
          newPassword2: '',
        });
      } catch (e: any) {
        toast.error(e.message || 'No se pudo cargar tu perfil');
      } finally {
        setLoading(false);
      }
    })();
  }, [setProfile]);

  const dirtyProfile = useMemo(() => {
    if (!me) return false;
    const baseLast = (me as any).lastName ?? (me as any).surname ?? '';
    return (name ?? '') !== (me.name ?? '') ||
           (lastName ?? '') !== (baseLast ?? '') ||
           (email ?? '') !== (me.email ?? '');
  }, [me, name, lastName, email]);

  const resetProfile = () => {
    if (!me) return;
    setName(me.name || '');
    setLastName((me as any).lastName ?? (me as any).surname ?? '');
    setEmail(me.email || '');
  };

  const onSaveProfile = async () => {
    if (!name.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Nombre, apellidos y email son obligatorios.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      setMe(updated);
      setProfile(updated);
      setName(updated.name || '');
      setLastName(lastName.trim()); 
      setEmail(updated.email || '');
      toast.success('Perfil actualizado');

      
      initialSnapRef.current = JSON.stringify({
        name: updated.name || '',
        lastName: lastName.trim(),
        email: updated.email || '',
        currentPassword: '',
        newPassword: '',
        newPassword2: '',
      });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async () => {
    if (!currentPassword || !newPassword || !newPassword2) {
      toast.error('Rellena todas las contraseñas.');
      return;
    }
    if (newPassword.length < MIN_PW) {
      toast.error(`La nueva contraseña debe tener al menos ${MIN_PW} caracteres.`);
      return;
    }
    if (newPassword !== newPassword2) {
      toast.error('Las contraseñas nuevas no coinciden.');
      return;
    }
    setSavingPwd(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      toast.success('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');

      
      initialSnapRef.current = JSON.stringify({
        name,
        lastName,
        email,
        currentPassword: '',
        newPassword: '',
        newPassword2: '',
      });
    } catch (e: any) {
      toast.error(e.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPwd(false);
    }
  };

  
  const currentSnap = useMemo(
    () =>
      JSON.stringify({
        name,
        lastName,
        email,
        currentPassword,
        newPassword,
        newPassword2,
      }),
    [name, lastName, email, currentPassword, newPassword, newPassword2]
  );
  const isDirty = currentSnap !== initialSnapRef.current;

  const goBack = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
      return;
    }
    navigate("student/dashboard");
  };

  if (loading) {
    return (
      <PageWithHeader>
        <div className="p-6 text-gray-600">Cargando configuración…</div>
     </PageWithHeader>
    );
  }

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-5xl p-6">
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
              <h1 className="text-2xl font-semibold">Configuración</h1>
              <p className="mt-1 text-gray-600">
                Gestiona tus datos de perfil y tu contraseña.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Perfil */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={18} />
              <h2 className="text-lg font-semibold">Datos de perfil</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nombre *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Apellidos *
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Tus apellidos"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={resetProfile}
                disabled={!dirtyProfile}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm
                  ${
                    dirtyProfile
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                <Undo2 size={16} />
                Deshacer cambios
              </button>
              <button
                onClick={onSaveProfile}
                disabled={savingProfile || !dirtyProfile}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white
                  ${
                    savingProfile || !dirtyProfile
                      ? "bg-indigo-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
              >
                <Save size={16} />
                {savingProfile ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>

          {/* Seguridad */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Lock size={18} />
              <h2 className="text-lg font-semibold">Seguridad</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Repetir nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Repite tu nueva contraseña"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={onSavePassword}
                  disabled={savingPwd}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white
                    ${
                      savingPwd
                        ? "bg-emerald-300 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                >
                  <ShieldCheck size={16} />
                  {savingPwd ? "Actualizando…" : "Cambiar contraseña"}
                </button>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Consejo: utiliza una contraseña única y difícil de adivinar.
              </p>
            </div>
          </div>
        </div>

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

export default Settings;
