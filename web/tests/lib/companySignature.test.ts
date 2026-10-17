// @vitest-environment jsdom
// jsdom for localStorage, where the session token is read from, and FileReader, which reads the .p12.
import { HttpError } from 'react-admin';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeAuth } from '../../src/providers/authStorage';
import { companySignatureUrl, fetchCompanySignature, removeCompanySignature, uploadCompanySignature } from '../../src/providers/companySignature';
import type { SignatureInfo } from '../../src/types/quoteDocuments';
import { mockFetch, sentHeader } from '../fakeFetch';
import type { FetchMock } from '../types';

const API: string = 'https://local/api';
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const info: SignatureInfo = {
  signerName: 'ANA MARÍA EJEMPLO PÉREZ', issuerName: 'AUTORIDAD DE CERTIFICACION DE PRUEBA', serialNumber: '1A2B3C', validFrom: '2026-01-01T00:00:00.000Z', validTo: '2126-01-01T00:00:00.000Z',
  certificateSha256: 'c'.repeat(64), size: 4, sha256: 'd'.repeat(64), status: 'valid', updatedBy: 'a@example.com', updatedAt: '2026-10-17T10:00:00Z',
};

beforeEach((): void => {
  writeAuth({ token: 'secret', userId: 1, email: 'a@example.com', name: null, expiresAt: '2099-01-01' });
});
afterEach((): void => {
  localStorage.clear();
});

describe('company electronic signature', (): void => {
  it('lives under the admin’s own API address', (): void => {
    expect(companySignatureUrl('https://local/api/')).toBe('https://local/api/quote-document-settings/1/signature');
  });

  it('is fetched with the session token, and a 404 means the company has none yet', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(json(200, info), json(404, { code: 'NOT_FOUND', message: 'Signature not found' }));
    expect(await fetchCompanySignature(API)).toEqual(info);
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer secret');
    expect(await fetchCompanySignature(API)).toBeNull();
  });

  it('is loaded as JSON: the file in base64 beside its password', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(json(200, info));
    const file: File = new File([Uint8Array.from([0x30, 0x82, 0x0d, 0xff])], 'firma.p12', { type: 'application/x-pkcs12' });
    expect(await uploadCompanySignature(API, file, 'clave-de-prueba')).toEqual(info);
    const [url, init]: Parameters<typeof fetch> = fetchMock.mock.calls[0];
    expect(url).toBe('https://local/api/quote-document-settings/1/signature');
    expect(init?.method).toBe('PUT');
    expect(sentHeader(init, 'Content-Type')).toBe('application/json');
    expect(sentHeader(init, 'Authorization')).toBe('Bearer secret');
    expect(JSON.parse(init?.body as string)).toEqual({ file: 'MIIN/w==', password: 'clave-de-prueba' });
  });

  it('keeps the field the API refused, to say it under that field', async (): Promise<void> => {
    mockFetch(json(422, { code: 'VALIDATION_ERROR', message: 'Validation failed', errors: { password: 'Wrong password' } }));
    const refusal: unknown = await uploadCompanySignature(API, new File(['x'], 'firma.p12'), 'otra').catch((error: unknown): unknown => error);
    expect(refusal).toBeInstanceOf(HttpError);
    expect(refusal).toMatchObject({ status: 422, body: { errors: { password: 'Wrong password' } } });
  });

  it('is removed with a DELETE', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(new Response(null, { status: 204 }));
    await removeCompanySignature(API);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });
});
