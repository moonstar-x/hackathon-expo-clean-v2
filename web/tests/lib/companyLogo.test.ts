// @vitest-environment jsdom
// jsdom for localStorage, where the session token is read from.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeAuth } from '../../src/providers/authStorage';
import { companyLogoUrl, fetchCompanyLogo, removeCompanyLogo, uploadCompanyLogo } from '../../src/providers/companyLogo';
import { mockFetch, sentHeader } from '../fakeFetch';
import type { FetchMock } from '../types';

const API: string = 'https://local/api';
const apiError = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach((): void => {
  writeAuth({ token: 'secret', userId: 1, email: 'a@example.com', name: null, expiresAt: '2099-01-01' });
});
afterEach((): void => {
  localStorage.clear();
});

describe('company logo', (): void => {
  it('lives under the admin’s own API address', (): void => {
    expect(companyLogoUrl('https://local/api/')).toBe('https://local/api/quote-document-settings/1/logo');
  });

  it('is fetched with the session token, and a 404 means the company has none yet', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(
      new Response('png bytes', { headers: { 'Content-Type': 'image/png' } }),
      apiError(404, { code: 'NOT_FOUND', message: 'Logo not found' }),
    );
    const logo: Blob | null = await fetchCompanyLogo(API);
    expect(logo?.type).toBe('image/png');
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer secret');
    expect(await fetchCompanyLogo(API)).toBeNull();
  });

  it('is uploaded as the image it is, and the API says what it saved', async (): Promise<void> => {
    const saved: Record<string, unknown> = { contentType: 'image/png', width: 800, height: 200, size: 9, sha256: 'a'.repeat(64), updatedBy: 'a@example.com', updatedAt: '2026-10-17T10:00:00Z' };
    const fetchMock: FetchMock = mockFetch(new Response(JSON.stringify(saved), { headers: { 'Content-Type': 'application/json' } }));
    const file: Blob = new Blob(['png bytes'], { type: 'image/png' });
    expect(await uploadCompanyLogo(API, file)).toEqual(saved);
    const [url, init]: Parameters<typeof fetch> = fetchMock.mock.calls[0];
    expect(url).toBe('https://local/api/quote-document-settings/1/logo');
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(file);
    expect(sentHeader(init, 'Content-Type')).toBe('image/png');
    expect(sentHeader(init, 'Authorization')).toBe('Bearer secret');
  });

  it('says in Spanish why the API refused a logo', async (): Promise<void> => {
    mockFetch(
      apiError(413, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }),
      apiError(422, { code: 'VALIDATION_ERROR', message: 'Validation failed', errors: { logo: 'Must be an 8-bit RGB or RGBA PNG' } }),
      apiError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Logo must be a PNG or JPEG image' }),
      apiError(401, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
    );
    const file: Blob = new Blob(['bytes'], { type: 'image/png' });
    await expect(uploadCompanyLogo(API, file)).rejects.toMatchObject({ status: 413, message: 'El logo debe pesar como máximo 1 MB.' });
    await expect(uploadCompanyLogo(API, file)).rejects.toMatchObject({ status: 422, message: 'El PNG debe ser de 8 bits, RGB o RGBA.' });
    await expect(uploadCompanyLogo(API, file)).rejects.toMatchObject({ status: 415, message: 'El logo debe ser una imagen PNG o JPG.' });
    await expect(uploadCompanyLogo(API, file)).rejects.toMatchObject({ status: 401, message: 'Debes iniciar sesión.' });
  });

  it('is removed with a DELETE', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(new Response(null, { status: 204 }));
    await removeCompanyLogo(API);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });
});
