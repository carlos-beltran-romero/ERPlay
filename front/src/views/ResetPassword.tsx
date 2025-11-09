import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import iconoWeb from '../assets/icono_web.png';
import { resetPassword } from '../services/auth';
import { useTheme } from '../app/ThemeContext';

const MIN_PW = 6;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const tooShort = password.length < MIN_PW; 
  const showLengthError = submitted && tooShort; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setStatus('idle');
    setError(null);

    if (tooShort) return; 

    try {
      await resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer contraseña');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-100 transition-colors duration-500 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <main className="relative mx-auto flex min-h-screen max-w-7xl lg:max-w-[1280px] items-center px-6 lg:px-8">
        <div className="w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-50/80 shadow-2xl backdrop-blur-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
          <div className="bg-gradient-to-b from-white/90 to-slate-50/90 p-8 sm:p-10 transition-colors duration-300 dark:from-slate-950/95 dark:to-slate-900/80">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={iconoWeb} alt="ERPlay" className="h-16" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-semibold text-slate-800 text-center dark:text-slate-100">
              Restablecer contraseña
            </h1>
            <p className="mt-1 text-sm text-slate-600 text-center dark:text-slate-300">
              Introduce tu nueva contraseña para tu cuenta.
            </p>

            {/* Feedback */}
            {status === 'success' && (
              <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 text-center dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-200">
                Contraseña restablecida. Redirigiendo al login…
              </div>
            )}
            {status === 'error' && error && (
              <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 text-center dark:border-rose-400/60 dark:bg-rose-500/15 dark:text-rose-200">
                {error}
              </div>
            )}

            {/* Form */}
            {status !== 'success' && (
              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm text-slate-600 dark:text-slate-300">
                    Nueva contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl bg-slate-50/70 px-3 py-3 text-[16px] text-slate-800 placeholder:text-slate-400 outline-none transition
                      ${showLengthError
                        ? 'border border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-rose-400/60 dark:bg-rose-500/10 dark:text-rose-100'
                        : 'border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-700/60'
                      }`}
                    required
                  />
                  {showLengthError && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                      La contraseña debe tener al menos {MIN_PW} caracteres.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!token}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-medium text-white transition
                    ${!token
                      ? 'bg-slate-400 cursor-not-allowed dark:bg-slate-600'
                      : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
                    }`}
                >
                  Restablecer contraseña
                </button>
              </form>
            )}

            {/* Back link */}
            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              <a href="/login" className="font-medium text-slate-500 hover:text-slate-700 hover:underline dark:text-slate-300 dark:hover:text-slate-100">
                Volver al Login
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
