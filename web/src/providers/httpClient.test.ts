import { beforeEach, describe, expect, it } from 'vitest';
import { jsonResponse, mockFetch, sentHeader } from '../test-utils';
import { writeAuth } from './authStorage';
import { createDataProvider } from './dataProvider';
import { httpClient, NETWORK_ERROR_MESSAGE } from './httpClient';

const inOneHour = () => new Date(Date.now() + 3600_000).toISOString();

describe('httpClient', () => {
  beforeEach(() => localStorage.clear());

  it('sends Authorization: Bearer <token> when logged in', async () => {
    writeAuth({ token: 'jwt-abc', expiresAt: inOneHour(), email: 'admin@example.com' });
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    const { json } = await httpClient('http://api.test/api/products/1');
    expect(json).toEqual({ ok: true });
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer jwt-abc');
  });

  it('sends no Authorization header when logged out', async () => {
    const fetchMock = mockFetch(jsonResponse([]));
    await httpClient('http://api.test/api/products');
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBeNull();
  });

  it('rejects with the status and the API message on errors', async () => {
    mockFetch(jsonResponse({ code: 'CONFLICT', message: 'SKU already exists', errors: { sku: 'SKU already exists' } }, { status: 409 }));
    await expect(httpClient('http://api.test/api/products', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 409,
      message: 'SKU already exists',
      // root.serverError makes react-admin's form toast show the API message.
      body: { errors: { sku: 'SKU already exists', root: { serverError: 'SKU already exists' } } },
    });
  });

  it('leaves errors without field details untouched', async () => {
    mockFetch(jsonResponse({ code: 'CONFLICT', message: 'Product has stock history' }, { status: 409 }));
    await expect(httpClient('http://api.test/api/products/1', { method: 'DELETE' })).rejects.toMatchObject({
      status: 409,
      message: 'Product has stock history',
      body: { code: 'CONFLICT', message: 'Product has stock history' },
    });
  });

  it('turns network failures into a readable error', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(httpClient('http://api.test/api/products')).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });
});

describe('dataProvider', () => {
  beforeEach(() => localStorage.clear());

  it('getStats calls GET {apiUrl}/stats with the token', async () => {
    writeAuth({ token: 'jwt-abc', expiresAt: inOneHour(), email: 'admin@example.com' });
    const stats = {
      products: { total: 1, active: 1, lowStock: 0, outOfStock: 0 },
      stockValue: 10,
      movementsLast30Days: { IN: 1, OUT: 0, ADJUSTMENT: 0 },
    };
    const fetchMock = mockFetch(jsonResponse(stats));
    await expect(createDataProvider('http://api.test/api').getStats()).resolves.toEqual(stats);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/stats');
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer jwt-abc');
  });

  it('getList uses the simple REST protocol and reads the total from Content-Range', async () => {
    const fetchMock = mockFetch(jsonResponse([{ id: 1 }], { headers: { 'Content-Range': 'products 0-0/42' } }));
    const result = await createDataProvider('http://api.test/api').getList('products', {
      pagination: { page: 1, perPage: 25 },
      sort: { field: 'name', order: 'ASC' },
      filter: { lowStock: true },
    });
    expect(result).toEqual({ data: [{ id: 1 }], total: 42 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/api/products');
    expect(JSON.parse(url.searchParams.get('range')!)).toEqual([0, 24]);
    expect(JSON.parse(url.searchParams.get('sort')!)).toEqual(['name', 'ASC']);
    expect(JSON.parse(url.searchParams.get('filter')!)).toEqual({ lowStock: true });
  });
});
