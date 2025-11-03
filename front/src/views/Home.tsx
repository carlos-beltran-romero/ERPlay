import { Link } from 'react-router-dom';
import heroPattern from '../assets/pattern-molecules.png';
import teacherIcon from '../assets/teacher_icon.png';
import completedIcon from '../assets/completed.png';
import logo from '../assets/icono_web.png';

/**
 * Página de inicio pública con mensajes clave y llamadas a la acción.
 * @public
 */
const Home: React.FC = () => {
  const features = [
    {
      title: 'Evaluaciones inteligentes',
      description: 'Diseña diagramas interactivos con retroalimentación inmediata y métricas de desempeño.',
    },
    {
      title: 'Supervisión en tiempo real',
      description: 'Aprueba, comenta y mejora preguntas creadas por el alumnado sin perder su historial.',
    },
    {
      title: 'Progreso accionable',
      description: 'Analiza el avance de cada estudiante y detecta áreas de mejora con paneles claros.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src={heroPattern} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 sm:px-10">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 text-xl font-semibold">
              <img src={logo} alt="ERPlay" className="h-10 w-10" />
              ERPlay
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/login" className="rounded-full border border-slate-400/40 px-4 py-2 hover:border-slate-200">
                Iniciar sesión
              </Link>
              <Link to="/student/dashboard" className="hidden rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 sm:block">
                Entrar a la plataforma
              </Link>
            </div>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-300">
                Formación basada en diagramas ER
              </span>
              <h1 className="text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">
                Crea, supervisa y mejora evaluaciones colaborativas sin perder el control.
              </h1>
              <p className="text-lg text-slate-300">
                ERPlay conecta a supervisores y estudiantes con un flujo de revisión transparente, métricas profundas y una experiencia accesible desde cualquier dispositivo.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/login" className="rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400">
                  Comenzar ahora
                </Link>
                <a href="#features" className="rounded-full border border-slate-400/40 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-200">
                  Ver funcionalidades
                </a>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative flex w-full max-w-md flex-col gap-6 rounded-3xl bg-slate-900/60 p-6 backdrop-blur lg:-mr-10">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <img src={teacherIcon} alt="Supervisores" className="h-12 w-12 rounded-full border border-slate-700" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50">Supervisores conectados</h2>
                    <p className="text-sm text-slate-300">Gestiona preguntas, valida aportes y guía al alumnado.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 p-4">
                  <img src={completedIcon} alt="Progreso" className="h-12 w-12 rounded-full border border-slate-700" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50">Resultados medibles</h2>
                    <p className="text-sm text-slate-300">Indicadores claros para tomar decisiones pedagógicas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-10" id="features">
        <section className="grid gap-10 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-slate-900/20 transition hover:border-emerald-400/60 hover:shadow-emerald-500/20"
            >
              <h3 className="text-xl font-semibold text-slate-50">{feature.title}</h3>
              <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 grid gap-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-slate-50">Diseñada para equipos educativos modernos</h2>
            <p className="text-slate-300">
              ERPlay ofrece flujos claros de creación y revisión, elimina fricciones y mantiene el contexto de cada pregunta para que ninguna aportación del alumnado desaparezca sin supervisión.
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Revisiones colaborativas con trazabilidad completa.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Exporta métricas para informes institucionales.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Compatible con modo claro y oscuro automáticamente.
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-slate-900/80 p-6">
            <p className="text-lg font-semibold text-slate-50">¿Listo para evaluaciones más humanas?</p>
            <Link to="/login" className="rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400">
              Solicita un acceso demo
            </Link>
            <p className="text-sm text-slate-300">
              O conoce el panel del alumnado desde <Link to="/student/play-menu" className="font-semibold text-emerald-300 hover:text-emerald-200">el modo práctica</Link>.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 sm:flex-row sm:px-10">
          <p>&copy; {new Date().getFullYear()} ERPlay. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="mailto:contacto@erplay.io" className="hover:text-slate-200">
              contacto@erplay.io
            </a>
            <Link to="/login" className="hover:text-slate-200">
              Acceso plataforma
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
