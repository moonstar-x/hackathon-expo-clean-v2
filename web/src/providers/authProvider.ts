import type { AuthProvider } from 'react-admin';
import { clearAuth, hasValidSession, readAuth, writeAuth } from './authStorage';
import { NETWORK_ERROR_MESSAGE } from './httpClient';

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { email: string };
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') {
      return (body as { message: string }).message;
    }
  } catch {
    // Not JSON.
  }
  return fallback;
}

export function createAuthProvider(apiUrl: string): AuthProvider {
  return {
    async login({ username, password }: { username: string; password: string }) {
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
        throw new Error(await readMessage(response, `Login failed (HTTP ${response.status})`));
      }

      const body = (await response.json()) as LoginResponse;
      writeAuth({ token: body.token, expiresAt: body.expiresAt, email: body.user.email });
    },

    async logout() {
      clearAuth();
    },

    async checkAuth() {
      if (hasValidSession()) return;
      const hadSession = readAuth() !== null;
      clearAuth();
      // First visit: go to the login page quietly. Expired token: say why.
      throw hadSession ? new Error('Your session has expired. Please log in again.') : { message: false };
    },

    async checkError(error: { status?: number }) {
      if (error?.status === 401) {
        clearAuth();
        throw new Error('Your session has expired. Please log in again.');
      }
      // Anything else (403, 409, 500, network errors) keeps the user logged in.
    },

    async getIdentity() {
      const auth = readAuth();
      if (!auth) throw new Error('Not authenticated');
      return { id: auth.email, fullName: auth.email };
    },

    async getPermissions() {
      return undefined;
    },
  };
}
