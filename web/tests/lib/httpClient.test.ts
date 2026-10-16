// @vitest-environment jsdom
// jsdom for localStorage, where the session token is read from.
import { beforeEach, describe, expect, it } from 'vitest';
import type { GetListResult } from 'react-admin';
import { NETWORK_ERROR_MESSAGE } from '../../src/constants/http';
import { writeAuth } from '../../src/providers/authStorage';
import { createDataProvider } from '../../src/providers/dataProvider';
import { httpClient } from '../../src/providers/httpClient';
import type { Stats } from '../../src/types/api';
import type { HttpResponse } from '../../src/types/providers';
import { jsonResponse, mockFetch, sentHeader } from '../fakeFetch';
import type { FetchMock } from '../types';

const inOneHour = (): string => new Date(Date.now() + 3600_000).toISOString();

describe('httpClient', () => {
  beforeEach((): void => localStorage.clear());

  it('sends Authorization: Bearer <token> when logged in', async (): Promise<void> => {
    writeAuth({ token: 'jwt-abc', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null });
    const fetchMock: FetchMock = mockFetch(jsonResponse({ ok: true }));
    const { json }: HttpResponse<unknown> = await httpClient('http://api.test/api/products/1');
    expect(json).toEqual({ ok: true });
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer jwt-abc');
  });

  it('sends no Authorization header when logged out', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(jsonResponse([]));
    await httpClient('http://api.test/api/products');
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBeNull();
  });

  it('preserves the status and localizes API notifications and inline errors', async (): Promise<void> => {
    mockFetch(
      jsonResponse({ code: 'CONFLICT', message: 'SKU already exists', errors: { sku: 'SKU already exists' } }, { status: 409 }),
    );
    await expect(httpClient('http://api.test/api/products', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un producto con este SKU.',
      // root.serverError makes react-admin's form toast show the API message.
      body: {
        errors: { sku: 'Ya existe un producto con este SKU.', root: { serverError: 'Ya existe un producto con este SKU.' } },
      },
    });
  });

  it('localizes errors without field details and preserves the API code', async (): Promise<void> => {
    mockFetch(jsonResponse({ code: 'CONFLICT', message: 'Product has stock history' }, { status: 409 }));
    await expect(httpClient('http://api.test/api/products/1', { method: 'DELETE' })).rejects.toMatchObject({
      status: 409,
      message: 'El producto tiene un historial de inventario. Desactívalo para archivarlo.',
      body: { code: 'CONFLICT', message: 'El producto tiene un historial de inventario. Desactívalo para archivarlo.' },
    });
  });

  it('turns network failures into a readable error', async (): Promise<void> => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(httpClient('http://api.test/api/products')).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });
});

describe('dataProvider', () => {
  beforeEach((): void => localStorage.clear());

  it('getStats calls GET {apiUrl}/stats with the token', async (): Promise<void> => {
    writeAuth({ token: 'jwt-abc', expiresAt: inOneHour(), userId: 1, email: 'admin@example.com', name: null });
    const stats: Stats = {
      products: { total: 1, active: 1, lowStock: 0, outOfStock: 0 },
      stockValue: 10,
      movementsLast30Days: { IN: 1, OUT: 0, ADJUSTMENT: 0 },
    };
    const fetchMock: FetchMock = mockFetch(jsonResponse(stats));
    await expect(createDataProvider('http://api.test/api').getStats()).resolves.toEqual(stats);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/stats');
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer jwt-abc');
  });

  it('getList uses the simple REST protocol and reads the total from Content-Range', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(jsonResponse([{ id: 1 }], { headers: { 'Content-Range': 'products 0-0/42' } }));
    const result: GetListResult = await createDataProvider('http://api.test/api').getList('products', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'ASC' },
      filter: { lowStock: true },
    });
    expect(result).toEqual({ data: [{ id: 1 }], total: 42 });
    const input: Parameters<typeof fetch>[0] = fetchMock.mock.calls[0][0];
    const url: URL = new URL(input instanceof Request ? input.url : input.toString());
    expect(url.pathname).toBe('/api/products');
    expect(JSON.parse(url.searchParams.get('range') ?? 'null')).toEqual([0, 24]);
    expect(JSON.parse(url.searchParams.get('sort') ?? 'null')).toEqual(['name', 'ASC']);
    expect(JSON.parse(url.searchParams.get('filter') ?? 'null')).toEqual({ lowStock: true });
  });
});
