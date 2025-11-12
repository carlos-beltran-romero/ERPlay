import type { UserProfile } from './users';

let cachedProfile: UserProfile | null = null;

/**
 * Devuelve el perfil en memoria del usuario autenticado.
 * @returns Perfil cacheado o `null` si no hay sesión activa.
 * @public
 */
export function getCachedProfile(): UserProfile | null {
  return cachedProfile;
}

/**
 * Actualiza el perfil cacheado para futuros accesos sin red.
 * @param profile - Perfil obtenido desde la API o `null` tras logout.
 * @public
 */
export function setCachedProfile(profile: UserProfile | null) {
  cachedProfile = profile;
}

/**
 * Limpia la caché en memoria del perfil.
 * Útil cuando el refresh token expira o durante el logout.
 * @public
 */
export function clearProfileCache() {
  cachedProfile = null;
}
