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

interface AuthContextValue {
  readonly profile: UserProfile | null;
  readonly loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
