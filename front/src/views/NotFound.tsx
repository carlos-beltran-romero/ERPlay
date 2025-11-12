import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

/**
 * Página genérica para rutas no encontradas.
 * Sugiere navegación según el rol autenticado.
 * @public
 */
const NotFound: FC = () => {
  const { profile } = useAuth();

  const primaryHref = profile
    ? profile.role === 'supervisor'
      ? '/supervisor/dashboard'
      : '/student/dashboard'
    : '/login';

  const primaryLabel = profile
    ? profile.role === 'supervisor'
      ? 'Ir al panel de supervisión'
      : 'Ir al panel de estudiante'
    : 'Ir al inicio de sesión';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-zinc-100 to-stone-100 py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <span className="rounded-full bg-slate-900/10 px-4 py-1 text-sm font-medium text-slate-700">404</span>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Página no encontrada
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          La ruta que intentas visitar no existe o ha cambiado. Utiliza los accesos directos para regresar a un lugar
          seguro dentro de la plataforma.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={primaryHref}
            className={[
              'inline-flex items-center justify-center rounded-xl',
              'bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm',
              'transition hover:bg-slate-800',
            ].join(' ')}
          >
            {primaryLabel}
          </Link>
          <Link
            to="/"
            className={[
              'inline-flex items-center justify-center rounded-xl border border-slate-300',
              'px-6 py-3 text-sm font-medium text-slate-700 transition',
              'hover:border-slate-400 hover:text-slate-900',
            ].join(' ')}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
