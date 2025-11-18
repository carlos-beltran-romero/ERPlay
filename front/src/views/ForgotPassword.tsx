import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import iconoWeb from '../assets/icono_web.png';
import { forgotPassword } from '../services/auth';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setError(null);

    const start = Date.now();
    setLoading(true);

    try {
      await forgotPassword(email);
      const elapsed = Date.now() - start;
      const MIN = 1000;
      if (elapsed < MIN) {
        await new Promise(res => setTimeout(res, MIN - elapsed));
      }
      setStatus('sent');
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const MIN = 1000;
      if (elapsed < MIN) {
        await new Promise(res => setTimeout(res, MIN - elapsed));
      }
      setError(err.message || 'Error al enviar el enlace');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[color:var(--color-body)] text-[color:var(--color-foreground)] transition-colors">
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(99,102,241,0.2), transparent 55%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.15), transparent 50%)'
        }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-elevated)] p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src={iconoWeb} alt="ERLean" className="h-20" />
          </div>
          <h2 className="text-3xl font-semibold text-center">Recuperar contraseña</h2>
          <p className="mt-2 text-center text-[color:var(--color-muted)]">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          {status === 'sent' && (
            <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-center text-sm text-emerald-700">
              Si ese correo existe, recibirás un enlace en tu bandeja de entrada.
            </p>
          )}
          {status === 'error' && error && (
            <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">{error}</p>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[color:var(--color-muted)]">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-3 text-[16px] text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted-soft)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                loading ? 'cursor-wait opacity-75' : ''
              }`}
              disabled={loading || status === 'sent'}
            >
              {loading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3.464-3.464A12 12 0 004 12z"
                    />
                  </svg>
                  <span>Enviando…</span>
                </>
              ) : status === 'sent' ? (
                'Enlace enviado'
              ) : (
                'Enviar enlace'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[color:var(--color-muted)]">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
