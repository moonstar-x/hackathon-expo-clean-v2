import type { ReactElement } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { testDataProvider, type DataProvider, type GetOneResult, type RaRecord, type UpdateParams, type UpdateResult } from 'react-admin';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { writeAuth } from '../../../src/providers/authStorage';
import CompanySettings from '../../../src/quoteDocuments/CompanySettings';
import * as logoImages from '../../../src/utils/logo';
import { sentHeader } from '../../fakeFetch';
import { renderWithAdmin } from '../../renderWithAdmin';

// The canvas work (fitting a logo, reading its pixels) needs a real browser; here it is stubbed, and
// the API is a fake fetch for the logo and a fake data provider for the settings record.
vi.mock('../../../src/utils/logo', (): object => ({ fitLogo: vi.fn(), readLogoPixels: vi.fn() }));

const RED: [number, number, number, number] = [225, 29, 72, 255];
let hasLogo: boolean;
let putStatus: number;
let fetchMock: Mock<typeof fetch>;
let update: Mock<(resource: string, params: UpdateParams) => Promise<UpdateResult>>;

const settings = (overrides: Record<string, unknown> = {}): RaRecord => ({
  id: 1, tradeName: 'Limpiezas Andinas', legalName: 'Limpiezas Andinas S.A.', taxId: '0991234567001', signerName: 'Ana Pérez', signerTitle: 'Gerente general',
  numberPrefix: 'COT', validityDays: 30, paperSize: 'A4', paymentTerms: 'Mensual', brandColor: '#4F46E5', ...overrides,
});
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The logo endpoint: GET answers the logo or a 404, PUT answers `putStatus`, DELETE removes it. */
const logoApi = (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const method: string = init?.method ?? 'GET';
  if (method === 'PUT') {
    if (putStatus !== 200) return Promise.resolve(json(putStatus, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }));
    hasLogo = true;
    return Promise.resolve(json(200, { contentType: 'image/png', width: 800, height: 200, size: 6, sha256: 'a'.repeat(64), updatedBy: 'ana@example.com', updatedAt: '2026-10-17T10:00:00Z' }));
  }
  if (method === 'DELETE') {
    hasLogo = false;
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  return Promise.resolve(hasLogo ? new Response('logo', { headers: { 'Content-Type': 'image/png' } }) : json(404, { code: 'NOT_FOUND', message: 'Logo not found' }));
};

const renderCompany = (record: RaRecord = settings()): void => {
  update = vi.fn((_resource: string, params: UpdateParams): Promise<UpdateResult> => Promise.resolve({ data: { ...record, ...(params.data as object), id: 1 } }));
  const dataProvider: DataProvider = testDataProvider({
    getOne: <R extends RaRecord>(): Promise<GetOneResult<R>> => Promise.resolve({ data: record as R }),
    update: update as DataProvider['update'],
  });
  const view: ReactElement = <Routes><Route path="/company" element={<CompanySettings />} /></Routes>;
  renderWithAdmin(view, { at: '/company', dataProvider });
};
const fileInput = (): HTMLInputElement => document.querySelector<HTMLInputElement>('input[type="file"]')!;

beforeEach((): void => {
  hasLogo = false;
  putStatus = 200;
  writeAuth({ token: 'test-token', expiresAt: '2099-01-01T00:00:00Z', userId: 1, email: 'ana@example.com', name: 'Ana Pérez' });
  fetchMock = vi.fn(logoApi);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('URL', class extends URL { static createObjectURL(): string { return 'blob:logo'; } static revokeObjectURL(): void {} });
  vi.mocked(logoImages.fitLogo).mockImplementation((file: File): Promise<Blob> => Promise.resolve(new Blob(['fitted'], { type: file.type })));
  vi.mocked(logoImages.readLogoPixels).mockResolvedValue(Uint8ClampedArray.from(Array.from({ length: 50 }, (): number[] => RED).flat()));
});

describe('Empresa: logo and color', (): void => {
  it('previews the header with the trade name while the company has no logo', async (): Promise<void> => {
    renderCompany();
    expect(await screen.findByText('Sin logo, las cotizaciones muestran el nombre comercial.')).toBeInTheDocument();
    const preview: HTMLElement = screen.getByRole('figure', { name: 'Vista previa del encabezado de la cotización' });
    expect(within(preview).getByText('Limpiezas Andinas')).toBeInTheDocument();
    expect(within(preview).getByText('COTIZACIÓN')).toBeInTheDocument();
    expect(within(preview).getByText('N.º COT-00001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir logo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar logo' })).not.toBeInTheDocument();
  });

  it('shows the saved logo and offers its colors', async (): Promise<void> => {
    hasLogo = true;
    renderCompany();
    expect(await screen.findByRole('img', { name: 'Logo de la empresa' })).toHaveAttribute('src', 'blob:logo');
    expect(await screen.findByRole('button', { name: 'Usar #E11D48' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar logo' })).toBeInTheDocument();
    expect(sentHeader(fetchMock.mock.calls[0][1], 'Authorization')).toBe('Bearer test-token');
  });

  it('warns when the logo is too narrow to print sharp', async (): Promise<void> => {
    hasLogo = true;
    renderCompany();
    const image: HTMLElement = await screen.findByRole('img', { name: 'Logo de la empresa' });
    Object.defineProperty(image, 'naturalWidth', { value: 200 });
    fireEvent.load(image);
    expect(await screen.findByText('El logo es pequeño: puede verse borroso al imprimir.')).toBeInTheDocument();
  });

  it('uploads a picked file at once, fitted, with the token and its type', async (): Promise<void> => {
    renderCompany();
    await screen.findByText('Sin logo, las cotizaciones muestran el nombre comercial.');
    fireEvent.change(fileInput(), { target: { files: [new File(['picked'], 'logo.png', { type: 'image/png' })] } });
    expect(await screen.findByText('Logo actualizado.')).toBeInTheDocument();
    const put: Parameters<typeof fetch> | undefined = fetchMock.mock.calls.find((call: Parameters<typeof fetch>): boolean => call[1]?.method === 'PUT');
    expect(put?.[0]).toBe('http://api.test/api/quote-document-settings/1/logo');
    expect(sentHeader(put?.[1], 'Authorization')).toBe('Bearer test-token');
    expect(sentHeader(put?.[1], 'Content-Type')).toBe('image/png');
    expect(logoImages.fitLogo).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('img', { name: 'Logo de la empresa' })).toBeInTheDocument();
  });

  it('says a logo over 1 MB is too heavy', async (): Promise<void> => {
    putStatus = 413;
    renderCompany();
    await screen.findByText('Sin logo, las cotizaciones muestran el nombre comercial.');
    fireEvent.change(fileInput(), { target: { files: [new File(['picked'], 'logo.png', { type: 'image/png' })] } });
    expect(await screen.findByText('El logo debe pesar como máximo 1 MB.')).toBeInTheDocument();
  });

  it('asks before removing the logo', async (): Promise<void> => {
    hasLogo = true;
    renderCompany();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar logo' }));
    expect(await screen.findByText('¿Quitar el logo? Las nuevas cotizaciones mostrarán el nombre comercial en su lugar.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call: Parameters<typeof fetch>): boolean => call[1]?.method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Logo quitado.')).toBeInTheDocument();
    expect(await screen.findByText('Sin logo, las cotizaciones muestran el nombre comercial.')).toBeInTheDocument();
  });

  it('saves a color from the logo along with the company fields only', async (): Promise<void> => {
    hasLogo = true;
    renderCompany();
    fireEvent.click(await screen.findByRole('button', { name: 'Usar #E11D48' }));
    expect(screen.getByLabelText('Código de color')).toHaveValue('#E11D48');
    expect(screen.getByRole('button', { name: 'Usar #E11D48' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor((): void => expect(update).toHaveBeenCalled());
    const sent: Record<string, unknown> = update.mock.calls[0][1].data as Record<string, unknown>;
    expect(sent).toMatchObject({ brandColor: '#E11D48', tradeName: 'Limpiezas Andinas', signerTitle: 'Gerente general' });
    for (const field of ['numberPrefix', 'validityDays', 'paperSize', 'paymentTerms', 'id']) expect(sent).not.toHaveProperty(field);
  });

  it('refuses a mistyped color code', async (): Promise<void> => {
    renderCompany();
    const code: HTMLElement = await screen.findByLabelText('Código de color');
    fireEvent.change(code, { target: { value: 'zz12' } });
    expect(code).toHaveValue('#ZZ12');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Usa un color como #4F46E5.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('goes back to the default color, and warns about one too light for the paper', async (): Promise<void> => {
    renderCompany(settings({ brandColor: '#FAFAF0' }));
    expect(await screen.findByText('Muy claro: la franja casi no se verá sobre el papel.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(screen.getByLabelText('Código de color')).toHaveValue('#4F46E5');
    expect(screen.queryByText('Muy claro: la franja casi no se verá sobre el papel.')).not.toBeInTheDocument();
  });
});
