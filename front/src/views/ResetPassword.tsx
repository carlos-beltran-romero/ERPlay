import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import iconoWeb from '../assets/icono_web.png';
import { resetPassword } from '../services/auth';

const MIN_PW = 6;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen relative bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-100">
      <main className="relative mx-auto flex min-h-screen max-w-7xl lg:max-w-[1280px] items-center px-6 lg:px-8">
        <div className="w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-50/80 shadow-2xl backdrop-blur-sm">
          <div className="bg-gradient-to-b from-white/90 to-slate-50/90 p-8 sm:p-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={iconoWeb} alt="ERPlay" className="h-16" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-semibold text-slate-800 text-center">
              Restablecer contraseña
            </h1>
            <p className="mt-1 text-sm text-slate-600 text-center">
              Introduce tu nueva contraseña para tu cuenta.
            </p>

            {/* Feedback */}
            {status === 'success' && (
              <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 text-center">
                Contraseña restablecida. Redirigiendo al login…
              </div>
            )}
            {status === 'error' && error && (
              <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 text-center">
                {error}
              </div>
            )}

            {/* Form */}
            {status !== 'success' && (
              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm text-slate-600">
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
                        ? 'border border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200'
                        : 'border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200'
                      }`}
                    required
                  />
                  {showLengthError && (
                    <p className="mt-1 text-xs text-rose-600">
                      La contraseña debe tener al menos {MIN_PW} caracteres.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!token}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-medium text-white transition
                    ${!token
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                >
                  Restablecer contraseña
                </button>
              </form>
            )}

            {/* Back link */}
            <p className="mt-6 text-center text-sm text-slate-600">
              <a href="/login" className="font-medium text-slate-500 hover:text-slate-700 hover:underline">
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
