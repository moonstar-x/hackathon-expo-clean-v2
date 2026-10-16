// @vitest-environment jsdom
// jsdom for localStorage, where the session is kept.
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthProvider } from 'react-admin';
import { AUTH_STORAGE_KEY } from '../../src/constants/app';
import { NETWORK_ERROR_MESSAGE } from '../../src/constants/http';
import { createAuthProvider } from '../../src/providers/authProvider';
import { readAuth, updateStoredUser, writeAuth } from '../../src/providers/authStorage';
import { jsonResponse, mockFetch } from '../fakeFetch';
import type { FetchMock } from '../types';

const API_URL: string = 'http://api.test/api';
const inOneHour = (): string => new Date(Date.now() + 3600_000).toISOString();
const anHourAgo = (): string => new Date(Date.now() - 3600_000).toISOString();

describe('authProvider', () => {
  const authProvider: AuthProvider = createAuthProvider(API_URL);
  beforeEach((): void => localStorage.clear());

  describe('login', () => {
    it('posts { email, password } to /auth/login and stores the session', async (): Promise<void> => {
      const expiresAt: string = inOneHour();
      const fetchMock: FetchMock = mockFetch(
        jsonResponse({ token: 'jwt-123', expiresAt, user: { id: 7, email: 'admin@example.com', name: 'Ana Pérez' } }),
      );

      await authProvider.login({ username: 'Admin@Example.com', password: 's3cret!!' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init]: Parameters<typeof fetch> = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_URL}/auth/login`);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({ email: 'Admin@Example.com', password: 's3cret!!' });
      expect(readAuth()).toEqual({ token: 'jwt-123', expiresAt, userId: 7, email: 'admin@example.com', name: 'Ana Pérez' });
    });

    it("rejects with the API's message on 401 and stores nothing", async (): Promise<void> => {
      mockFetch(jsonResponse({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, { status: 401 }));
      await expect(authProvider.login({ username: 'a@b.c', password: 'nope' })).rejects.toThrow(
        'Correo electrónico o contraseña incorrectos.',
      );
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it("rejects with the API's message when rate-limited", async (): Promise<void> => {
      mockFetch(jsonResponse({ code: 'RATE_LIMITED', message: 'Too many login attempts' }, { status: 429 }));
      await expect(authProvider.login({ username: 'a@b.c', password: 'x' })).rejects.toThrow(
        'Demasiados intentos de inicio de sesión. Inténtalo más tarde.',
      );
    });

    it('rejects with a readable message when the API is unreachable', async (): Promise<void> => {
      mockFetch(new TypeError('Failed to fetch'));
      await expect(authProvider.login({ username: 'a@b.c', password: 'x' })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    });
  });

  describe('checkAuth', () => {
    it('rejects quietly when there is no token', async (): Promise<void> => {
      await expect(authProvider.checkAuth({})).rejects.toMatchObject({ message: false });
    });

    it('rejects and clears storage when the token is expired', async (): Promise<void> => {
      writeAuth({ token: 't', expiresAt: anHourAgo(), userId: 1, email: 'admin@example.com', name: null });
      await expect(authProvider.checkAuth({})).rejects.toThrow('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      expect(readAuth()).toBeNull();
    });

    it('rejects when storage holds garbage', async (): Promise<void> => {
      localStorage.setItem(AUTH_STORAGE_KEY, '{not json');
      await expect(authProvider.checkAuth({})).rejects.toBeDefined();
    });

    it('treats a session saved before user accounts existed as logged out', async (): Promise<void> => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 't', expiresAt: inOneHour(), email: 'admin@example.com' }));
      expect(readAuth()).toBeNull();
      await expect(authProvider.checkAuth({})).rejects.toBeDefined();
    });

    it('resolves when the token is valid', async (): Promise<void> => {
      writeAuth({ token: 't', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null });
      await expect(authProvider.checkAuth({})).resolves.toBeUndefined();
    });
  });

  describe('checkError', () => {
    beforeEach((): void =>
      writeAuth({ token: 't', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null }),
    );

    it('rejects and clears storage on 401', async (): Promise<void> => {
      await expect(authProvider.checkError({ status: 401 })).rejects.toBeDefined();
      expect(readAuth()).toBeNull();
    });

    it.each([403, 409, 422, 500])('resolves and keeps the session on %s', async (status: number): Promise<void> => {
      await expect(authProvider.checkError({ status })).resolves.toBeUndefined();
      expect(readAuth()).not.toBeNull();
    });

    it('resolves on network errors (no status)', async (): Promise<void> => {
      await expect(authProvider.checkError(new Error('offline'))).resolves.toBeUndefined();
    });
  });

  it('logout clears the stored session', async (): Promise<void> => {
    writeAuth({ token: 't', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null });
    await authProvider.logout({});
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('getIdentity returns the user id, the name (falling back to the email) and the email', async (): Promise<void> => {
    writeAuth({ token: 't', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null });
    await expect(authProvider.getIdentity?.()).resolves.toEqual({
      id: 1,
      fullName: 'admin@example.com',
      email: 'admin@example.com',
    });

    writeAuth({ token: 't', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: 'Ana Pérez' });
    await expect(authProvider.getIdentity?.()).resolves.toEqual({
      id: 1,
      fullName: 'Ana Pérez',
      email: 'admin@example.com',
    });
  });

  it('updateStoredUser refreshes the stored email and name but keeps the token', (): void => {
    const expiresAt: string = inOneHour();
    writeAuth({ token: 't', expiresAt, userId: 1, email: 'admin@example.com', name: null });
    updateStoredUser({ email: 'ana@example.com', name: 'Ana Pérez' });
    expect(readAuth()).toEqual({ token: 't', expiresAt, userId: 1, email: 'ana@example.com', name: 'Ana Pérez' });
  });

  it('getPermissions resolves undefined', async (): Promise<void> => {
    await expect(authProvider.getPermissions?.({})).resolves.toBeUndefined();
  });
});
