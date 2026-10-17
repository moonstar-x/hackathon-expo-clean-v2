import type { ReactElement } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { testDataProvider, type DataProvider, type GetOneResult, type RaRecord, type UpdateParams, type UpdateResult } from 'react-admin';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { writeAuth } from '../../../src/providers/authStorage';
import CompanySettings from '../../../src/quoteDocuments/CompanySettings';
import type { SignatureInfo } from '../../../src/types/quoteDocuments';
import { formatDate } from '../../../src/utils/dates';
import { renderWithAdmin } from '../../renderWithAdmin';

// The API is a fake fetch for the signature (the company has no logo) and a fake data provider for the
// settings record, whose form the signature's dialog must never submit.

const SIGNER: string = 'ANA MARÍA EJEMPLO PÉREZ';
const DAY_MS: number = 24 * 60 * 60 * 1000;
let stored: SignatureInfo | null;
let refusal: Record<string, string> | null;
let fetchMock: Mock<typeof fetch>;
let update: Mock<(resource: string, params: UpdateParams) => Promise<UpdateResult>>;

const info = (overrides: Partial<SignatureInfo> = {}): SignatureInfo => ({
  signerName: SIGNER, issuerName: 'AUTORIDAD DE CERTIFICACION DE PRUEBA', serialNumber: '1A2B3C', validFrom: '2026-01-01T00:00:00.000Z', validTo: '2126-01-01T00:00:00.000Z',
  certificateSha256: 'c'.repeat(64), size: 3634, sha256: 'd'.repeat(64), status: 'valid', updatedBy: 'ana@example.com', updatedAt: '2026-10-17T10:00:00Z', ...overrides,
});
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The signature endpoint: GET answers it or a 404, PUT stores it unless `refusal` names a field, DELETE removes it. */
const api = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  if (!(url instanceof Request ? url.url : url.toString()).endsWith('/signature')) return Promise.resolve(json(404, { code: 'NOT_FOUND', message: 'Logo not found' }));
  const method: string = init?.method ?? 'GET';
  if (method === 'PUT') {
    if (refusal) return Promise.resolve(json(422, { code: 'VALIDATION_ERROR', message: 'Validation failed', errors: refusal }));
    stored = info();
    return Promise.resolve(json(200, stored));
  }
  if (method === 'DELETE') {
    stored = null;
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  return Promise.resolve(stored ? json(200, stored) : json(404, { code: 'NOT_FOUND', message: 'Signature not found' }));
};

const renderCompany = (): void => {
  const record: RaRecord = { id: 1, tradeName: 'Limpiezas Andinas', legalName: 'Limpiezas Andinas S.A.', signerName: 'Ana Pérez', signerTitle: 'Gerente general', brandColor: '#4F46E5' };
  update = vi.fn((_resource: string, params: UpdateParams): Promise<UpdateResult> => Promise.resolve({ data: { ...record, ...(params.data as object), id: 1 } }));
  const dataProvider: DataProvider = testDataProvider({
    getOne: <R extends RaRecord>(): Promise<GetOneResult<R>> => Promise.resolve({ data: record as R }),
    update: update as DataProvider['update'],
  });
  const view: ReactElement = <Routes><Route path="/company" element={<CompanySettings />} /></Routes>;
  renderWithAdmin(view, { at: '/company', dataProvider });
};
// `hidden`: an open dialog hides the page behind it from the accessibility tree.
const preview = (): HTMLElement => screen.getByRole('figure', { name: 'Vista previa del espacio de firma de la empresa', hidden: true });
const dialog = (): HTMLElement => screen.getByRole('dialog', { name: 'Cargar firma electrónica' });
const pick = (file: File): void => {
  fireEvent.change(dialog().querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files: [file] } });
};
const p12 = (bytes: Uint8Array<ArrayBuffer> = Uint8Array.from([0x30, 0x82, 0x0d, 0xff]), name: string = 'firma.p12'): File => new File([bytes], name, { type: 'application/x-pkcs12' });
const openDialog = async (): Promise<void> => {
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar firma' }));
  await screen.findByRole('dialog', { name: 'Cargar firma electrónica' });
};
const send = (password: string): void => {
  if (password) fireEvent.change(within(dialog()).getByLabelText('Contraseña de la firma'), { target: { value: password } });
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cargar firma' }));
};
const puts = (): Parameters<typeof fetch>[] => fetchMock.mock.calls.filter((call: Parameters<typeof fetch>): boolean => call[1]?.method === 'PUT');

beforeEach((): void => {
  stored = null;
  refusal = null;
  writeAuth({ token: 'test-token', expiresAt: '2099-01-01T00:00:00Z', userId: 1, email: 'ana@example.com', name: 'Ana Pérez' });
  fetchMock = vi.fn(api);
  vi.stubGlobal('fetch', fetchMock);
});

describe('Empresa: electronic signature', (): void => {
  it('leaves the space to sign by hand while the company has no signature', async (): Promise<void> => {
    renderCompany();
    expect(await screen.findByText('Sin firma electrónica, las cotizaciones dejan el espacio para firmar a mano.')).toBeInTheDocument();
    expect(within(preview()).getByText('Firma a mano')).toBeInTheDocument();
    for (const line of ['Ana Pérez', 'Gerente general', 'Limpiezas Andinas S.A.']) expect(within(preview()).getByText(line)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar firma' })).not.toBeInTheDocument();
  });

  it('shows the QR stamp over the company’s line, and the certificate’s details', async (): Promise<void> => {
    stored = info();
    renderCompany();
    expect(await screen.findByText('Firmado electrónicamente por:')).toBeInTheDocument();
    expect(within(preview()).getByText(SIGNER)).toBeInTheDocument();
    expect(within(preview()).queryByText('Firma a mano')).not.toBeInTheDocument();
    for (const [label, value] of [['Titular', SIGNER], ['Emitida por', 'AUTORIDAD DE CERTIFICACION DE PRUEBA'], ['Vigente hasta', formatDate('2126-01-01T00:00:00.000Z')]]) {
      expect(screen.getByText(label, { selector: 'dt' }).nextElementSibling).toHaveTextContent(value);
    }
    expect(screen.getByRole('button', { name: 'Cambiar firma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar firma' })).toBeInTheDocument();
  });

  it('loads a .p12 with its password at once, without saving the settings form', async (): Promise<void> => {
    renderCompany();
    await openDialog();
    pick(p12());
    expect(within(dialog()).getByText('firma.p12')).toBeInTheDocument();
    send('clave-de-prueba');
    expect(await screen.findByText('Firma electrónica cargada: las nuevas descargas en PDF saldrán firmadas.')).toBeInTheDocument();
    expect(puts()).toHaveLength(1);
    expect(puts()[0][0]).toBe('http://api.test/api/quote-document-settings/1/signature');
    expect(JSON.parse(puts()[0][1]?.body as string)).toEqual({ file: 'MIIN/w==', password: 'clave-de-prueba' });
    await waitFor((): void => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(within(preview()).getByText(SIGNER)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('checks the file and the password before sending them', async (): Promise<void> => {
    renderCompany();
    await openDialog();
    send('');
    expect(within(dialog()).getByText('Elige el archivo de tu firma.')).toBeInTheDocument();
    expect(within(dialog()).getByText('Escribe la contraseña de la firma.')).toBeInTheDocument();
    pick(new File(['png'], 'logo.png', { type: 'image/png' }));
    expect(within(dialog()).getByText('Elige un archivo .p12 o .pfx.')).toBeInTheDocument();
    pick(p12(new Uint8Array(64 * 1024 + 1), 'FIRMA.PFX'));
    expect(within(dialog()).getByText('El archivo debe pesar como máximo 64 KB.')).toBeInTheDocument();
    send('clave-de-prueba');
    expect(puts()).toHaveLength(0);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    [{ password: 'Wrong password' }, 'La contraseña no corresponde a esta firma.'],
    [{ file: 'The certificate has expired' }, 'La firma electrónica está caducada.'],
    [{ file: 'Must be a PKCS#12 (.p12 or .pfx) file' }, 'El archivo debe ser una firma electrónica .p12 o .pfx.'],
  ])('says under the field what the API refused: %o', async (errors: Record<string, string>, message: string): Promise<void> => {
    refusal = errors;
    renderCompany();
    await openDialog();
    pick(p12());
    send('otra-clave');
    expect(await within(dialog()).findByText(message)).toBeInTheDocument();
    expect(within(preview()).getByText('Firma a mano')).toBeInTheDocument();
  });

  it.each<[string, Partial<SignatureInfo>, string]>([
    ['expired', { status: 'expired', validTo: '2026-01-02T00:00:00.000Z' }, 'Caducó: las cotizaciones se descargan sin firma hasta que cargues una vigente.'],
    ['unavailable', { status: 'unavailable' }, 'No se puede usar la firma guardada: vuelve a cargarla.'],
    ['about to expire', { validTo: new Date(Date.now() + 10 * DAY_MS).toISOString() }, 'Vence pronto: renuévala para seguir firmando las cotizaciones.'],
  ])('says when the signature is %s', async (_case: string, overrides: Partial<SignatureInfo>, note: string): Promise<void> => {
    stored = info(overrides);
    renderCompany();
    expect(await screen.findByText(note)).toBeInTheDocument();
    // Only a signature that signs puts its stamp on the documents.
    expect(within(preview()).queryByText('Firma a mano') === null).toBe(overrides.status === undefined);
  });

  it('asks before removing the signature', async (): Promise<void> => {
    stored = info();
    renderCompany();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar firma' }));
    expect(await screen.findByText('¿Quitar la firma electrónica? Las nuevas descargas saldrán sin firma, con el espacio para firmar a mano.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call: Parameters<typeof fetch>): boolean => call[1]?.method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Firma electrónica quitada.')).toBeInTheDocument();
    expect(await screen.findByText('Sin firma electrónica, las cotizaciones dejan el espacio para firmar a mano.')).toBeInTheDocument();
  });
});
