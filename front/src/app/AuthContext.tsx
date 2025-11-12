import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { getProfile, type UserProfile } from '../services/users';
import { setCachedProfile, getCachedProfile, clearProfileCache } from '../services/authCache';

/**
 * Valor expuesto por {@link AuthProvider} con el estado de autenticación.
 * @public
 */
export interface AuthContextValue {
  /** Perfil autenticado o `null` si no hay sesión. */
  readonly profile: UserProfile | null;
  /** Indica si se está recuperando el perfil desde la API. */
  readonly loading: boolean;
  /** Fuerza la recarga del perfil desde el backend. */
  refreshProfile: () => Promise<UserProfile | null>;
  /** Permite sobrescribir manualmente el perfil en caché. */
  setProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Obtiene el perfil del usuario gestionando la caché local.
 * @returns Perfil actualizado o `null` si la sesión expiró.
 * @internal
 */
async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const profile = await getProfile();
    setCachedProfile(profile);
    return profile;
  } catch {
    clearProfileCache();
    return null;
  }
}

/**
 * Proveedor de autenticación. Recupera el perfil y ofrece helpers a los hijos.
 * @param children - Contenido descendiente que requiere el contexto.
 * @public
 */
export function AuthProvider({ children }: PropsWithChildren<unknown>) {
  const initialProfile = getCachedProfile();
  const [profile, setProfileState] = useState<UserProfile | null>(() => initialProfile);
  const [loading, setLoading] = useState(!initialProfile);

  const setProfile = useCallback((value: UserProfile | null) => {
    setProfileState(value);
    if (value) setCachedProfile(value);
    else clearProfileCache();
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    const next = await fetchProfile();
    setProfileState(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    if (initialProfile) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      setProfileState(null);
      clearProfileCache();
      return;
    }

    refreshProfile().catch(() => {
      setLoading(false);
    });
  }, [initialProfile, refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ profile, loading, refreshProfile, setProfile }),
    [profile, loading, refreshProfile, setProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook de acceso al contexto de autenticación.
 * @returns Perfil, estado de carga y helpers del contexto.
 * @throws Error si se usa fuera de {@link AuthProvider}.
 * @public
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
