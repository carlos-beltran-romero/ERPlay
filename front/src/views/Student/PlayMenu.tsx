// src/views/PlayMenu.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageWithHeader from '../PageWithHeader';
import { GraduationCap, BookOpenCheck, LayoutDashboard } from 'lucide-react';

type TileProps = {
  title: string;
  subtitle: string;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const Tile: React.FC<TileProps> = ({ title, subtitle, onClick, Icon }) => (
  <button
    onClick={onClick}
    className="group rounded-2xl border border-gray-200 bg-white p-7 text-left shadow-sm transition
               hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200
               flex flex-col justify-between"
    aria-label={title}
  >
    <div className="flex items-center gap-5">
      <div className="rounded-xl p-4 ring-1 ring-gray-200 bg-gradient-to-b from-indigo-50 to-white
                      group-hover:from-indigo-100 group-hover:to-white transition">
        <Icon size={30} className="text-indigo-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <p className="text-gray-500">{subtitle}</p>
      </div>
    </div>
    <div className="mt-6 text-sm font-medium text-indigo-600 transition-all group-hover:translate-x-1.5">
      Entrar →
    </div>
  </button>
);

const PlayMenu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageWithHeader>
      <div className="mx-auto w-full max-w-7xl p-8">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Elige un modo</h1>
            <p className="text-gray-600">Selecciona cómo quieres practicar hoy.</p>
          </div>

          {/* Botón para ir al dashboard del estudiante */}
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
                       text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            aria-label="Ir al dashboard"
            title="Ir al dashboard"
          >
            <LayoutDashboard size={16} className="text-indigo-600" />
            <span>Ir al dashboard</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Tile
            title="Modo Examen"
            subtitle="Condiciones reales: tiempo y puntuación."
            onClick={() => navigate('/student/play-exam')}
            Icon={GraduationCap}
          />
          <Tile
            title="Modo Aprendizaje"
            subtitle="Sin presión: pistas y feedback inmediato."
            onClick={() => navigate('/student/play-learning')}
            Icon={BookOpenCheck}
          />
        </div>
      </div>
    </PageWithHeader>
  );
};

export default PlayMenu;
