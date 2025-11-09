import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import iconoWeb from '../assets/icono_web.png';
import { forgotPassword } from '../services/auth';
import { useTheme } from '../app/ThemeContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setError(null);

    const start = Date.now();
    setLoading(true);

    try {
      await forgotPassword(email);
      // Asegura que el spinner dure al menos 1s
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
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-gray-200 via-white to-gray-200 p-4 transition-colors duration-500 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-colors duration-300 dark:border dark:border-slate-700/70 dark:bg-slate-900/80">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={iconoWeb} alt="ERLean Logo" className="h-20" />
        </div>

        {/* Title */}
        <h2 className="mb-4 text-center text-3xl font-extrabold text-gray-800 dark:text-slate-100">
          Recuperar Contraseña
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-gray-600 dark:text-slate-300">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {/* Feedback Messages */}
        {status === 'sent' && (
          <p className="mb-4 text-center text-green-600 dark:text-emerald-300">
            Si ese correo existe, recibirás un enlace en tu bandeja de entrada.
          </p>
        )}
        {status === 'error' && error && (
          <p className="mb-4 text-center text-red-600 dark:text-rose-300">{error}</p>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-gray-700 dark:text-slate-300">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-lg border border-gray-300 px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-slate-700"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center space-x-2 rounded-lg bg-slate-800 py-3 font-semibold text-white transition-colors
              ${loading ? 'cursor-wait opacity-75' : 'hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'}`}
            disabled={loading || status === 'sent'}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
                <span>Enviando...</span>
              </>
            ) : status === 'sent' ? (
              'Enlace enviado'
            ) : (
              'Enviar enlace'
            )}
          </button>
        </form>

        {/* Back Link */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
          <a href="/login" className="font-medium text-slate-500 hover:text-slate-700 hover:underline dark:text-slate-300 dark:hover:text-slate-100">
            Volver al Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
