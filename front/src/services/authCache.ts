import type { UserProfile } from "./users";

let cachedProfile: UserProfile | null = null;

export function getCachedProfile(): UserProfile | null {
  return cachedProfile;
}

export function setCachedProfile(profile: UserProfile | null) {
  cachedProfile = profile;
}

export function clearProfileCache() {
  cachedProfile = null;
}
