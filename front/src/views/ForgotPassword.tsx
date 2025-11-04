import React, { useState } from "react";
import iconoWeb from "../assets/icono_web.png";
import { forgotPassword } from "../services/auth";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setError(null);

    const start = Date.now();
    setLoading(true);

    try {
      await forgotPassword(email);
      const elapsed = Date.now() - start;
      const MIN = 1000;
      if (elapsed < MIN) {
        await new Promise((res) => setTimeout(res, MIN - elapsed));
      }
      setStatus("sent");
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const MIN = 1000;
      if (elapsed < MIN) {
        await new Promise((res) => setTimeout(res, MIN - elapsed));
      }
      setError(err.message || "Error al enviar el enlace");
      setStatus("error");
    } finally {
      setLoading(false);
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
          Recuperar Contraseña
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          Ingresa tu correo electrónico y te enviaremos un enlace para
          restablecer tu contraseña.
        </p>

        {/* Feedback Messages */}
        {status === "sent" && (
          <p className="text-green-600 text-center mb-4">
            Si ese correo existe, recibirás un enlace en tu bandeja de entrada.
          </p>
        )}
        {status === "error" && error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center space-x-2 py-3 bg-slate-800 text-white font-semibold rounded-lg transition-colors
              ${loading ? "cursor-wait opacity-75" : "hover:bg-slate-700"}`}
            disabled={loading || status === "sent"}
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
            ) : status === "sent" ? (
              "Enlace enviado"
            ) : (
              "Enviar enlace"
            )}
          </button>
        </form>

        {/* Back Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <a
            href="/login"
            className="font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Volver al Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
