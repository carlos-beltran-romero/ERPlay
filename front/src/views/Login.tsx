import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import teacherIcon from "../assets/teacher_icon.png";
import patternBg from "../assets/pattern-molecules.png";
import { login as apiLogin } from "../services/auth";
import { getProfile, type UserProfile } from "../services/users";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../app/AuthContext";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { setProfile } = useAuth();

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setCheckingSession(false);
        return;
      }
      try {
        const me = await getProfile();
        setProfile(me);
        if (me.role === "supervisor")
          navigate("/supervisor/dashboard", { replace: true });
        else navigate("/student/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setProfile(null);
        setCheckingSession(false);
      }
    })();
  }, [navigate, setProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken } = await apiLogin(email, password);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      const me: UserProfile = await getProfile();
      setProfile(me);
      if (me.role === "supervisor")
        navigate("/supervisor/dashboard", { replace: true });
      else navigate("/student/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-100">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Comprobando sesión…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-100">
      {/* patrón sutil de fondo, con mezcla para que no “queme” blanco */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply"
        style={{
          backgroundImage: `url(${patternBg})`,
          backgroundSize: "900px",
          backgroundPosition: "center",
        }}
      />

      <main className="relative mx-auto flex min-h-screen max-w-7xl lg:max-w-[1280px] items-center px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-50/80 shadow-2xl backdrop-blur-sm md:grid-cols-2 md:min-h-[620px] lg:min-h-[700px]">
          {/* Lado visual / branding */}
          <div className="relative hidden md:block">
            <img
              src={teacherIcon}
              alt="Ilustración docente"
              className="absolute inset-0 h-full w-full object-contain p-6"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/55 via-slate-800/35 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-10 lg:p-12 text-slate-100">
              <div className="mb-6 text-2xl font-semibold tracking-tight">
                ERPlay
              </div>
              <p className="max-w-sm text-sm text-slate-100/90">
                Practica, mejora y mide tu progreso en modelos ER con una
                experiencia sencilla y enfocada al aprendizaje.
              </p>
              <div className="mt-6 h-0.5 w-16 rounded bg-slate-200/70" />
            </div>
          </div>

          {/* Formulario (centrado vertical) */}
          <div className="relative isolate bg-gradient-to-b from-white/90 to-slate-50/90 p-10 sm:p-12 lg:p-14 flex items-center">
            {/* wrapper con ancho cómodo */}
            <div className="w-full max-w-md mx-auto">
              <div className="mb-7">
                <h1 className="text-3xl font-semibold text-slate-800">
                  Iniciar sesión
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Bienvenido de nuevo
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm text-slate-600"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-11 pr-3 py-3 text-[16px] text-slate-800 placeholder:text-slate-400 outline-none transition
                       focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
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
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-11 pr-12 py-3 text-[16px] text-slate-800 placeholder:text-slate-400 outline-none transition
                       focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-600 hover:bg-slate-100"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-medium text-white transition
          ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {loading ? "Entrando…" : "Entrar"}
                </button>
              </form>

              

              <div className="mt-8 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} ERPlay · Todos los derechos
                reservados
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
