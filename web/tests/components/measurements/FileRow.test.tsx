import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent, type UserEvent } from '@testing-library/user-event';
import FileRow from '../../../src/components/measurements/Show/FilesTab/FileRow';
import type { MeasurementFile } from '../../../src/types/api';
import { jsonResponse, mockFetch } from '../../fakeFetch';
import { renderWithAdmin } from '../../renderWithAdmin';
import type { FetchMock } from '../../types';

const model: MeasurementFile = { url: 'http://api.test/api/measurements/7/files/model', contentType: 'model/vnd.usdz+zip', size: 180_000 };

/** The list the row belongs in. */
const renderRow = (kind: 'model' | 'csv' = 'model'): void => {
  renderWithAdmin(
    <ul>
      <FileRow measurementId={7} kind={kind} file={model} />
    </ul>,
  );
};

/** The links clicked to save a download; jsdom would otherwise try to navigate to them. */
let savedLinks: HTMLAnchorElement[] = [];

beforeEach((): void => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn((): string => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  savedLinks = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement): void {
    savedLinks.push(this);
  });
});

describe('FileRow', () => {
  it('says what the file is and how big, with the Quick Look hint on the model', (): void => {
    renderRow();
    expect(screen.getByText('Modelo 3D (USDZ)')).toBeInTheDocument();
    expect(screen.getByText('175,8 KB')).toBeInTheDocument();
    expect(screen.getByText('Se abre con Vista rápida en iPhone, iPad y Mac.')).toBeInTheDocument();
  });

  it('leaves the hint off other files', (): void => {
    renderRow('csv');
    expect(screen.getByText('Medidas (CSV)')).toBeInTheDocument();
    expect(screen.queryByText(/Vista rápida/)).not.toBeInTheDocument();
  });

  it('waits for the file, then saves it under the API’s name', async (): Promise<void> => {
    const user: UserEvent = userEvent.setup();
    let answer: (response: Response) => void = (): void => {};
    const fetchMock: FetchMock = vi.fn<typeof fetch>(
      (): Promise<Response> =>
        new Promise<Response>((resolve: (response: Response) => void): void => {
          answer = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderRow();

    await user.click(screen.getByRole('button', { name: 'Descargar Modelo 3D (USDZ)' }));
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/measurements/7/files/model?download=1');
    expect(screen.getByRole('button', { name: 'Descargando…' })).toBeDisabled();

    answer(new Response('usdz', { headers: { 'Content-Disposition': 'attachment; filename="Sala.usdz"' } }));
    expect(await screen.findByRole('button', { name: 'Descargar Modelo 3D (USDZ)' })).toBeEnabled();
    expect(savedLinks.map((link: HTMLAnchorElement): string => link.download)).toEqual(['Sala.usdz']);
  });

  it('says what failed when the API refuses', async (): Promise<void> => {
    const user: UserEvent = userEvent.setup();
    mockFetch(jsonResponse({ code: 'NOT_FOUND', message: 'Measurement file not found' }, { status: 404 }));
    renderRow();
    await user.click(screen.getByRole('button', { name: 'Descargar Modelo 3D (USDZ)' }));
    expect(await screen.findByText('No se encontró el archivo de la medición.')).toBeInTheDocument();
  });
});
