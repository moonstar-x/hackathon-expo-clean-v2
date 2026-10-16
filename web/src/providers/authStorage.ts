export const AUTH_STORAGE_KEY = 'inventory.auth';

export interface StoredAuth {
  token: string;
  /** ISO timestamp when the token expires. */
  expiresAt: string;
  email: string;
}

// Every localStorage access is guarded: it can throw in private mode, when
// storage is disabled, or when the quota is exceeded.

export function readAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredAuth).token === 'string' &&
      typeof (parsed as StoredAuth).expiresAt === 'string' &&
      typeof (parsed as StoredAuth).email === 'string'
    ) {
      return parsed as StoredAuth;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAuth(auth: StoredAuth): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // Storage unavailable: the session will only last until the next reload.
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** True when there is a stored token whose expiry is still in the future. */
export function hasValidSession(now: number = Date.now()): boolean {
  const auth = readAuth();
  if (!auth?.token) return false;
  const expiresAt = Date.parse(auth.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}
