import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import teacherIcon from '../assets/teacher_icon.png';
import patternBg from '../assets/pattern-molecules.png';
import { login as apiLogin } from '../services/auth';
import { getProfile, type UserProfile } from '../services/users';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setCheckingSession(false);
        return;
      }
      try {
        const me = await getProfile();
        if (me.role === 'supervisor') navigate('/supervisor/dashboard', { replace: true });
        else navigate('/student/dashboard', { replace: true });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setCheckingSession(false);
      }
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken } = await apiLogin(email, password);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      const me: UserProfile = await getProfile();
      if (me.role === 'supervisor') navigate('/supervisor/dashboard', { replace: true });
      else navigate('/student/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Comprobando sesión…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* patrón muy sutil de fondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${patternBg})`,
          backgroundSize: "900px",
          backgroundPosition: "center",
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl md:grid-cols-2">
          {/* Lado visual / branding */}
          <div className="relative hidden md:block">
            <img
              src={teacherIcon}
              alt="Ilustración docente"
              className="absolute inset-0 h-full w-full object-contain" // Cambié object-cover por object-contain
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/70 via-indigo-800/40 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-8 text-indigo-50">
              <div className="mb-6 text-2xl font-semibold tracking-tight">
                ERPlay
              </div>
              <p className="max-w-sm text-sm text-indigo-100/90">
                Practica, mejora y mide tu progreso en modelos ER con una
                experiencia sencilla y enfocada al aprendizaje.
              </p>
              <div className="mt-6 h-0.5 w-16 rounded bg-indigo-300/70" />
            </div>
          </div>

          {/* Formulario */}
          <div className="relative isolate p-8 sm:p-10">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-800">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-sm text-slate-500">Bienvenido de nuevo</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm text-slate-600"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-[15px] text-slate-800 outline-none transition
                               focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm text-slate-600"
                  >
                    Contraseña
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-10 py-2.5 text-[15px] text-slate-800 outline-none transition
                               focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition
                  ${
                    loading
                      ? "bg-indigo-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            {/* Pie pequeño */}
            <div className="mt-6 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} ERPlay · Todos los derechos
              reservados
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
