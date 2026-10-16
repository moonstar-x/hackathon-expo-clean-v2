import type { AuthProvider, UserIdentity } from 'react-admin';
import { NETWORK_ERROR_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../constants/http';
import { translateApiError } from '../i18n/apiErrors';
import type { ApiErrorBody } from '../types/api';
import type { LoginParams, LoginResponse, StoredAuth } from '../types/providers';
import { clearAuth, hasValidSession, readAuth, writeAuth } from './authStorage';

/** The API's error message in Spanish, or `fallback` when the body has none. */
const readMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const error: ApiErrorBody = body;
      if (typeof error.message === 'string') return translateApiError(error.message, error.code);
    }
  } catch {
    // Not JSON.
  }
  return fallback;
};

export const createAuthProvider = (apiUrl: string): AuthProvider => ({
  login: async ({ username, password }: LoginParams): Promise<void> => {
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
    } catch {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (!response.ok) {
      throw new Error(await readMessage(response, `No se pudo iniciar sesión (HTTP ${response.status}).`));
    }

    const body: LoginResponse = (await response.json()) as LoginResponse;
    writeAuth({
      token: body.token,
      expiresAt: body.expiresAt,
      userId: body.user.id,
      email: body.user.email,
      name: body.user.name ?? null,
    });
  },

  logout: (): Promise<void> => {
    clearAuth();
    return Promise.resolve();
  },

  checkAuth: (): Promise<void> => {
    if (hasValidSession()) return Promise.resolve();
    const hadSession: boolean = readAuth() !== null;
    clearAuth();
    // First visit: go to the login page quietly (react-admin skips the notification when the
    // message is false). Expired token: say why.
    return Promise.reject(
      hadSession ? new Error(SESSION_EXPIRED_MESSAGE) : Object.assign(new Error(''), { message: false }),
    );
  },

  checkError: (error: { status?: number } | undefined): Promise<void> => {
    if (error?.status === 401) {
      clearAuth();
      return Promise.reject(new Error(SESSION_EXPIRED_MESSAGE));
    }
    // Anything else (403, 409, 500, network errors) keeps the user signed in.
    return Promise.resolve();
  },

  getIdentity: (): Promise<UserIdentity> => {
    const auth: StoredAuth | null = readAuth();
    if (!auth) return Promise.reject(new Error('No has iniciado sesión'));
    return Promise.resolve({ id: auth.userId, fullName: auth.name || auth.email, email: auth.email });
  },

  getPermissions: (): Promise<undefined> => Promise.resolve(undefined),
});
