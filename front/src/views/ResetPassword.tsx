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
    <div className="relative min-h-screen bg-[color:var(--color-body)] text-[color:var(--color-foreground)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.18), transparent 50%)',
        }}
      />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-elevated)] sm:p-10">
          <div className="mb-6 flex justify-center">
            <img src={iconoWeb} alt="ERPlay" className="h-16" />
          </div>

          <h1 className="text-3xl font-semibold text-center text-[color:var(--color-foreground)] !transition-none">
            Restablecer contraseña
          </h1>
          <p className="mt-1 text-center text-sm text-[color:var(--color-muted)]">
            Introduce una nueva contraseña para tu cuenta.
          </p>

          {status === 'success' && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
              Contraseña restablecida. Redirigiendo al login…
            </div>
          )}
          {status === 'error' && error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
              {error}
            </div>
          )}

          {status !== 'success' && (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm text-[color:var(--color-muted)]"
                >
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-2xl border px-4 py-3 text-[16px] text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted-soft)] focus:outline-none focus:ring-2 ${
                    showLengthError
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-[color:var(--color-border)] focus:ring-[color:var(--color-ring)]'
                  } bg-[color:var(--color-surface)]`}
                  required
                />
                {showLengthError && (
                  <p className="mt-1 text-xs text-rose-500">
                    La contraseña debe tener al menos {MIN_PW} caracteres.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!token}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition ${
                  !token ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                Restablecer contraseña
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[color:var(--color-muted)]">
            <a href="/login" className="font-medium text-indigo-500 hover:text-indigo-400">
              Volver al login
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
