import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/auth';
import {
  LogOut,
  ChevronDown,
  PlayCircle,
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Users,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { ThemeToggleButton } from '../ThemeToggle';

/**
 * Cabecera principal con navegación contextual y menú de usuario.
 */
const Header: React.FC = () => {
  const { profile, loading, setProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setProfile(null);
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-900/70 text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
            <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  if (!profile) return null;

  const go = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const goDashboard = () => {
    if (profile.role === 'supervisor') navigate('/supervisor/dashboard');
    else navigate('/student/dashboard');
  };

  const isSupervisor = profile.role === 'supervisor';
  const displayName = (profile.name?.trim() || profile.email || '').trim();
  const initial = displayName[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={goDashboard}
          className="group flex items-center gap-3 focus:outline-none"
          title="Inicio"
          aria-label="Ir al panel"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center shadow-inner">
            <span className="text-xs font-bold tracking-tight">ER</span>
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="font-semibold tracking-tight group-hover:opacity-90">ERPlay</div>
            <div className="text-[11px] text-white/60 -mt-0.5">Aprende con tests</div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton className="hidden sm:inline-flex" />
          <ThemeToggleButton className="sm:hidden !rounded-xl !px-2.5 !py-2" showLabel={false} />
          {!isSupervisor && (
            <button
              onClick={() => go('/student/play-menu')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-500 px-3 py-2 text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-indigo-300/50"
            >
              <PlayCircle size={18} />
              Jugar
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              title="Cuenta"
            >
              <div className="h-7 w-7 rounded-full bg-white/15 grid place-items-center">
                <span className="text-[12px] font-semibold">{initial}</span>
              </div>

              <div className="hidden md:flex md:flex-col md:items-start leading-tight">
                <span className="max-w-[12rem] truncate">{displayName}</span>
                <span className="text-[10px] text-white/60 capitalize">{profile.role}</span>
              </div>

              <ChevronDown size={16} className={`hidden sm:block transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-1"
              >
                <button
                  onClick={goDashboard}
                  role="menuitem"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                >
                  <LayoutDashboard size={16} />
                  Ir al panel
                </button>

                {!isSupervisor ? (
                  <>
                    <button
                      onClick={() => go('/student/my-tests')}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    >
                      <BarChart3 size={16} />
                      Mis tests
                    </button>
                    <button
                      onClick={() => go('/student/questions')}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    >
                      <MessageSquare size={16} />
                      Mis aportaciones
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => go('/supervisor/users')}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    >
                      <Users size={16} />
                      Usuarios
                    </button>
                    <button
                      onClick={() => go('/supervisor/tests')}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    >
                      <Layers size={16} />
                      Tests
                    </button>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
