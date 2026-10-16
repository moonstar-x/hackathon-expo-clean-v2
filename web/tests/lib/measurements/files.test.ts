// @vitest-environment jsdom
// jsdom for localStorage, where the session token is read from.
import { afterEach, describe, expect, it } from 'vitest';
import { NETWORK_ERROR_MESSAGE } from '../../../src/constants/http';
import { writeAuth } from '../../../src/providers/authStorage';
import { fetchMeasurementFile, measurementFileUrl } from '../../../src/providers/measurementFiles';
import { downloadName } from '../../../src/utils/files';
import { mockFetch, sentHeader } from '../../fakeFetch';
import type { FetchMock } from '../../types';

afterEach((): void => {
  localStorage.clear();
});

describe('measurement files', () => {
  it('builds the address from the admin’s own API URL', (): void => {
    expect(measurementFileUrl('https://local/api/', 2, 'floorPlan')).toBe('https://local/api/measurements/2/files/floorPlan');
  });

  it('sends the session token, and asks for an attachment when downloading', async (): Promise<void> => {
    writeAuth({ token: 'secret', userId: 1, email: 'a@example.com', name: null, expiresAt: '2099-01-01' });
    const fetchMock: FetchMock = mockFetch(new Response('file'));
    await fetchMeasurementFile('https://local/api', 2, 'floorPlan', { download: true });
    const [url, init]: Parameters<typeof fetch> = fetchMock.mock.calls[0];
    expect(url).toBe('https://local/api/measurements/2/files/floorPlan?download=1');
    expect(sentHeader(init, 'Authorization')).toBe('Bearer secret');
  });

  it('turns a 401 into an HttpError in Spanish, so react-admin signs out', async (): Promise<void> => {
    mockFetch(new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Authentication required' }), { status: 401 }));
    await expect(fetchMeasurementFile('https://local/api', 2, 'geometry')).rejects.toMatchObject({
      status: 401,
      message: 'Debes iniciar sesión.',
    });
  });

  it('says so when the API can’t be reached', async (): Promise<void> => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(fetchMeasurementFile('https://local/api', 2, 'geometry')).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });

  it('names a download as the API does, accents included', (): void => {
    expect(downloadName("attachment; filename*=UTF-8''Habitaci%C3%B3n.png", 'fallback')).toBe('Habitación.png');
    expect(downloadName('attachment; filename="Sala-plano.png"', 'fallback')).toBe('Sala-plano.png');
    expect(downloadName(null, 'medicion-2-csv')).toBe('medicion-2-csv');
  });
});
