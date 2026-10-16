export const AUTH_STORAGE_KEY = 'inventory.auth';

export interface StoredAuth {
  token: string;
  /** ISO timestamp when the token expires. */
  expiresAt: string;
  userId: number;
  email: string;
  name: string | null;
}

// Every localStorage access is guarded: it can throw in private mode, when
// storage is disabled, or when the quota is exceeded.

export function readAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Sessions saved before user accounts existed have no userId; treat them as logged out.
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredAuth).token === 'string' &&
      typeof (parsed as StoredAuth).expiresAt === 'string' &&
      typeof (parsed as StoredAuth).userId === 'number' &&
      typeof (parsed as StoredAuth).email === 'string'
    ) {
      const auth = parsed as StoredAuth;
      return { ...auth, name: typeof auth.name === 'string' ? auth.name : null };
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

/** Keeps the stored identity in sync after the logged-in user edits their own account. */
export function updateStoredUser(user: { email: string; name: string | null }): void {
  const auth = readAuth();
  if (auth) writeAuth({ ...auth, email: user.email, name: user.name });
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
