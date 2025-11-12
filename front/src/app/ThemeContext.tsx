import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

/** Nombre canónico de los temas soportados por la aplicación. */
export type ThemeName = 'light' | 'dark';

/**
 * Valor disponible en el contexto de tema.
 * @public
 */
export interface ThemeContextValue {
  /** Tema activo ("light" o "dark"). */
  theme: ThemeName;
  /** Indica si el tema actual es oscuro. */
  isDark: boolean;
  /** Define explícitamente el tema a utilizar. */
  setTheme: (theme: ThemeName) => void;
  /** Alterna entre light y dark. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'erplay::theme';

/**
 * Calcula el tema inicial respetando preferencias del usuario y del SO.
 * @internal
 */
function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  return media?.matches ? 'dark' : 'light';
}

/**
 * Sincroniza clases CSS y atributos del `<html>` con el tema activo.
 * @internal
 */
function syncDocumentTheme(theme: ThemeName) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Proveedor de tema con persistencia en localStorage y soporte para prefers-color-scheme.
 * @param children - Componentes que requieren acceso al tema.
 * @public
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const initial = getInitialTheme();
    if (typeof document !== 'undefined') {
      syncDocumentTheme(initial);
    }
    return initial;
  });
  const [hasExplicitPreference, setHasExplicitPreference] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark';
  });

  useLayoutEffect(() => {
    syncDocumentTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasExplicitPreference) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [hasExplicitPreference, theme]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = (event: MediaQueryListEvent) => {
      if (hasExplicitPreference) return;
      setThemeState(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [hasExplicitPreference]);

  const applyTheme = useCallback((next: ThemeName) => {
    setHasExplicitPreference(true);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setHasExplicitPreference(true);
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme: applyTheme,
      toggleTheme,
    }),
    [applyTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook de conveniencia para acceder al {@link ThemeContextValue}.
 * @returns Estado del tema y operaciones de cambio.
 * @throws Error si se usa fuera de {@link ThemeProvider}.
 * @public
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
