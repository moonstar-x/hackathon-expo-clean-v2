import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import MeasurementThumbnail from '../../../src/components/measurements/MeasurementThumbnail';
import { writeAuth } from '../../../src/providers/authStorage';
import { jsonResponse, mockFetch, sentHeader } from '../../fakeFetch';
import { renderWithAdmin } from '../../renderWithAdmin';
import type { FetchMock } from '../../types';

const measurement = (files: Record<string, unknown>): { id: number; name: string; files: Record<string, unknown> } => ({
  id: 3,
  name: 'Baño de visitas',
  files,
});

beforeEach((): void => {
  URL.createObjectURL = vi.fn((): string => 'blob:thumbnail');
  URL.revokeObjectURL = vi.fn();
});

describe('MeasurementThumbnail', () => {
  it('shows a muted tile, without asking the API, when the phone sent no thumbnail', (): void => {
    const fetchMock: FetchMock = mockFetch();
    renderWithAdmin(<MeasurementThumbnail />, { record: measurement({}) });
    expect(screen.getByRole('img', { name: 'Sin miniatura' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the thumbnail with the session token and shows it', async (): Promise<void> => {
    writeAuth({ token: 'secret', userId: 1, email: 'a@example.com', name: null, expiresAt: '2099-01-01' });
    const fetchMock: FetchMock = mockFetch(new Response('png'));
    const { container } = renderWithAdmin(<MeasurementThumbnail />, { record: measurement({ thumbnail: { size: 3 } }) });
    await vi.waitFor((): void => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:thumbnail');
    });
    const [url, init]: Parameters<typeof fetch> = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/measurements/3/files/thumbnail');
    expect(sentHeader(init, 'Authorization')).toBe('Bearer secret');
  });

  it('says the thumbnail failed instead of showing a broken image', async (): Promise<void> => {
    mockFetch(jsonResponse({ code: 'NOT_FOUND', message: 'Measurement file not found' }, { status: 404 }));
    renderWithAdmin(<MeasurementThumbnail />, { record: measurement({ thumbnail: { size: 3 } }) });
    expect(await screen.findByRole('img', { name: 'No se pudo cargar la miniatura' })).toBeInTheDocument();
  });
});
