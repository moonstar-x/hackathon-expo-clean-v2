import { AUTH_STORAGE_KEY } from '../constants/app';
import type { StoredAuth } from '../types/providers';

// Every localStorage access is guarded: it can throw in private mode, when
// storage is disabled, or when the quota is exceeded.

const isStoredAuth = (value: unknown): value is StoredAuth => {
  if (!value || typeof value !== 'object') return false;
  const auth: Partial<StoredAuth> = value;
  return (
    typeof auth.token === 'string' &&
    typeof auth.expiresAt === 'string' &&
    typeof auth.userId === 'number' &&
    typeof auth.email === 'string'
  );
};

/** The stored session; sessions saved before user accounts existed have no userId and count as logged out. */
export const readAuth = (): StoredAuth | null => {
  try {
    const raw: string | null = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredAuth(parsed)) return null;
    return { ...parsed, name: typeof parsed.name === 'string' ? parsed.name : null };
  } catch {
    return null;
  }
};

export const writeAuth = (auth: StoredAuth): void => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // Storage unavailable: the session will only last until the next reload.
  }
};

/** Keeps the stored identity in sync after the signed-in user edits their own account. */
export const updateStoredUser = (user: { email: string; name: string | null }): void => {
  const auth: StoredAuth | null = readAuth();
  if (auth) writeAuth({ ...auth, email: user.email, name: user.name });
};

export const clearAuth = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};

/** True when there is a stored token whose expiry is still in the future. */
export const hasValidSession = (now: number = Date.now()): boolean => {
  const auth: StoredAuth | null = readAuth();
  if (!auth?.token) return false;
  const expiresAt: number = Date.parse(auth.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
};
