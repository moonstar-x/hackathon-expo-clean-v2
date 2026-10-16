// @vitest-environment jsdom
// jsdom for localStorage, where the session token is read from.
import { afterEach, expect, it, vi } from 'vitest';
import { writeAuth } from '../../../src/providers/authStorage';
import { downloadName, fetchMeasurementFile, fileUrl } from '../../../src/measurements/files';
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });
it('builds local API file URLs and sends bearer credentials and download query', async () => {
  writeAuth({ token: 'secret', userId: 1, email: 'a@example.com', name: null, expiresAt: '2099-01-01' });
  const mock = vi.fn().mockResolvedValue(new Response('file')); vi.stubGlobal('fetch', mock);
  expect(fileUrl('https://local/api/', 2, 'floorPlan')).toBe('https://local/api/measurements/2/files/floorPlan');
  await fetchMeasurementFile('https://local/api', 2, 'floorPlan', true);
  expect(mock).toHaveBeenCalledWith('https://local/api/measurements/2/files/floorPlan?download=1', expect.objectContaining({ headers: { Authorization: 'Bearer secret' } }));
  expect(downloadName("attachment; filename*=UTF-8''Habitaci%C3%B3n.png", 'fallback')).toBe('Habitación.png');
});
it('exposes a 401 for react-admin session handling', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Authentication required' }), { status: 401 })));
  await expect(fetchMeasurementFile('https://local/api', 2, 'geometry')).rejects.toMatchObject({ status: 401, message: 'Debes iniciar sesión.' });
});
