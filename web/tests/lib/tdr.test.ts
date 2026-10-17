import { describe, expect, it } from 'vitest';
import { i18nProvider } from '../../src/i18n';
import { translateApiMessage } from '../../src/i18n/apiErrors';
import { createDataProvider } from '../../src/providers/dataProvider';
import type { InventoryDataProvider } from '../../src/types/providers';
import type { FetchMock } from '../types';
import type { CreateResult } from 'react-admin';
import { tdrName, tdrRefetchInterval } from '../../src/utils/tdr';
import { jsonResponse, mockFetch } from '../fakeFetch';

const doc = (status: string): { id: number; status: string } => ({ id: 1, status });
const query = (data: unknown): { state: { data?: unknown } } => ({ state: { data } });

describe('TDR polling', () => {
  it('asks again every 2 s while an entry is queued or analyzed, in a list, an infinite list or one record', (): void => {
    expect(tdrRefetchInterval(query({ data: [doc('done'), doc('running')], total: 2 }))).toBe(2000);
    expect(tdrRefetchInterval(query({ pages: [{ data: [doc('done')] }, { data: [doc('pending')] }] }))).toBe(2000);
    expect(tdrRefetchInterval(query(doc('pending')))).toBe(2000);
    expect(tdrRefetchInterval(query({ data: [doc('done'), doc('failed')], total: 2 }))).toBe(false);
    expect(tdrRefetchInterval(query(doc('done')))).toBe(false);
    expect(tdrRefetchInterval(query(undefined))).toBe(false);
  });

  it('names an entry by its service, else its file', (): void => {
    expect(tdrName({ title: 'Limpieza HGSFQ', fileName: 'ficha.pdf' })).toBe('Limpieza HGSFQ');
    expect(tdrName({ title: null, fileName: 'ficha.pdf' })).toBe('ficha.pdf');
  });
});

describe('TDR provider', () => {
  it('uploads the file as multipart, and the rest of the resources as JSON', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(jsonResponse({ id: 7, status: 'pending' }, { status: 201 }), jsonResponse({ id: 3, name: 'x' }, { status: 201 }));
    const provider: InventoryDataProvider = createDataProvider('http://api.test/api');
    const file: File = new File(['%PDF-1.4'], 'ficha.pdf', { type: 'application/pdf' });
    const created: CreateResult = await provider.create('tdr-documents', { data: { file: { rawFile: file, src: 'blob:x', title: 'ficha.pdf' } } });
    expect(created.data).toEqual({ id: 7, status: 'pending' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/tdr-documents');
    const body: FormData = init!.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('ficha.pdf');
    // The browser sets the multipart boundary; a JSON Content-Type would break it.
    expect(new Headers(init!.headers).get('Content-Type')).toBeNull();

    await provider.create('categories', { data: { name: 'x' } });
    expect(fetchMock.mock.calls[1][1]!.body).toBe(JSON.stringify({ name: 'x' }));
  });

  it('queues an analysis again and creates the quote', async (): Promise<void> => {
    const fetchMock: FetchMock = mockFetch(jsonResponse({ id: 7, status: 'pending' }, { status: 202 }), jsonResponse({ id: 12, name: 'Cotización' }, { status: 201 }));
    const provider: InventoryDataProvider = createDataProvider('http://api.test/api');
    expect(await provider.analyzeTdr(7)).toMatchObject({ status: 'pending' });
    expect(await provider.createTdrQuote(7)).toMatchObject({ id: 12 });
    expect(fetchMock.mock.calls.map(([url, init]: Parameters<typeof fetch>): [unknown, string | undefined] => [url, init?.method])).toEqual([
      ['http://api.test/api/tdr-documents/7/analyze', 'POST'],
      ['http://api.test/api/tdr-documents/7/quote', 'POST'],
    ]);
  });
});

describe('TDR copy', () => {
  it('says every analysis failure and the API refusals in Spanish', (): void => {
    for (const code of ['OPENROUTER_API_KEY_MISSING', 'OPENROUTER_AUTH', 'OPENROUTER_CREDITS', 'OPENROUTER_REJECTED', 'OPENROUTER_UNAVAILABLE', 'INVALID_RESPONSE', 'EMPTY_DOCUMENT', 'UNREADABLE_DOCUMENT', 'FILE_MISSING']) {
      expect(i18nProvider.translate(`app.tdr.errors.${code}`)).not.toBe(`app.tdr.errors.${code}`);
    }
    expect(translateApiMessage('Must be a PDF or Word (.docx) file')).toBe('Debe ser un PDF o un documento de Word (.docx).');
    expect(translateApiMessage('Add at least one zone')).toBe('Agrega al menos una zona para crear la cotización.');
    expect(translateApiMessage('Must have at most 100 items')).toBe('Puede tener como máximo 100 filas.');
    expect(i18nProvider.translate('resources.tdr-documents.name', { smart_count: 2 })).toBe('Documentos TDR');
  });
});
