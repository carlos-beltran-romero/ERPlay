import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import iconoWeb from '../assets/icono_web.png';
import { resetPassword } from '../services/auth';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setError(null);
    try {
      await resetPassword(token, password);
      setStatus('success');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer contraseña');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 via-white to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={iconoWeb} alt="ERLean Logo" className="h-20" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-4">
          Restablecer Contraseña
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          Ingresa tu nueva contraseña para tu cuenta.
        </p>

        {/* Feedback Messages */}
        {status === 'success' && (
          <p className="text-green-600 text-center mb-4">
            Contraseña restablecida. Redirigiendo al login…
          </p>
        )}
        {status === 'error' && error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        {/* Form */}
        {status !== 'success' && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition"
              disabled={!token}
            >
              Restablecer contraseña
            </button>
          </form>
        )}

        {/* Back Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <a href="/login" className="font-medium text-indigo-600 hover:underline">
            Volver al Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
