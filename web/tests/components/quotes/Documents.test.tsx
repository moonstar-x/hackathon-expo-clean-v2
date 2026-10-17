import { readFile } from 'node:fs/promises';
import type { ReactElement } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { HttpError, testDataProvider, type DataProvider, type RaRecord, type GetOneParams, type GetOneResult } from 'react-admin';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithAdmin, authProviderFor } from '../../renderWithAdmin';
import { QuoteDocumentPage } from '../../../src/quoteDocuments/QuoteDocumentPage';
import { QuoteDocumentRoute } from '../../../src/quoteDocuments/QuoteDocumentRoute';
import { XlsxPreview } from '../../../src/quoteDocuments/XlsxPreview';
import CompanySettings from '../../../src/quoteDocuments/CompanySettings';
import TemplateSettings from '../../../src/quoteDocuments/TemplateSettings';
import * as provider from '../../../src/providers/quoteDocuments';
import * as files from '../../../src/utils/files';
import documentJson from '../../fixtures/quote-document-A1.json';
import type { DocumentExport, DocumentState, QuoteDocument } from '../../../src/types/quoteDocuments';

vi.mock('../../../src/providers/quoteDocuments', (): object => ({ getDocumentState: vi.fn(), putDocumentData: vi.fn(), getDocumentExports: vi.fn(), fetchDocumentFile: vi.fn(), registerDocumentExport: vi.fn() }));
const state = (): DocumentState => ({ quoteId: 7, ready: true, blockers: [], warnings: [], data: { clientLegalName: 'Hospital Ejemplo S.A.', clientTaxId: null, clientContactName: 'Ana Ejemplo', clientContactTitle: null, clientEmail: null, clientPhone: null, clientAddress: null, issueDate: null, validityDays: null, paymentTerms: null, clientNotes: null, lineMode: 'perZone', contractMonths: null, number: null }, defaults: { issueDate: '2026-10-16', validityDays: 30, paymentTerms: 'Mensual' }, contentHash: 'a'.repeat(64), revision: 1, number: 'COT-00007', fileNames: { pdf: 'Cotizacion-COT-00007.pdf', xlsx: 'Cotizacion-COT-00007.xlsx' }, document: documentJson as QuoteDocument });
const exported: DocumentExport = { id: 1, format: 'pdf', number: 'COT-00007', revision: 1, contentHash: 'a'.repeat(64), exportedBy: 'ana@example.test', exportedAt: '2026-10-16T18:00:00Z' };
let blob: Blob;
function renderPage(): ReturnType<typeof renderWithAdmin> { return renderWithAdmin(<Routes><Route path="/quotes/:id/document" element={<QuoteDocumentPage />} /></Routes>, { at: '/quotes/7/document' }); }
beforeEach((): void => {
  vi.resetAllMocks();
  blob = new Blob(['preview bytes'], { type: 'application/pdf' });
  vi.stubGlobal('URL', class extends URL { static createObjectURL(): string { return 'blob:preview'; } static revokeObjectURL(): void {} });
  vi.mocked(provider.getDocumentState).mockResolvedValue(state()); vi.mocked(provider.getDocumentExports).mockResolvedValue([]);
  vi.mocked(provider.fetchDocumentFile).mockResolvedValue({ blob, hash: 'a'.repeat(64), name: 'preview.pdf' });
  vi.mocked(provider.registerDocumentExport).mockResolvedValue(exported); vi.mocked(provider.putDocumentData).mockResolvedValue(state());
});
describe('Documento page', (): void => {
  it('redirects anonymous visitors once before fetching document content', async (): Promise<void> => {
    renderWithAdmin(<Routes><Route path="/quotes/:id/document" element={<QuoteDocumentRoute />} /><Route path="/login" element={<p>Acceso de prueba</p>} /></Routes>, { at: '/quotes/7/document', authProvider: { ...authProviderFor(), checkAuth: (): Promise<void> => Promise.reject(new Error('Sesión requerida')) } });
    expect(await screen.findByText('Acceso de prueba')).toBeInTheDocument(); expect(provider.getDocumentState).not.toHaveBeenCalled();
  });
  it('lists all blockers with fix links and disables downloads', async (): Promise<void> => {
    vi.mocked(provider.getDocumentState).mockResolvedValue({ ...state(), ready: false, document: null, blockers: [{ code: 'ISSUER_FIELD_MISSING', params: { field: 'taxId' } }, { code: 'CLIENT_FIELD_MISSING', params: { field: 'clientLegalName' } }, { code: 'QUOTE_NEEDS_REVIEW' }] });
    renderPage(); expect(await screen.findByText('Falta información para generar la cotización')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Falta RUC en los datos de tu empresa.' })).toHaveAttribute('href', '/company');
    expect(screen.getByRole('link', { name: /Falta Razón social del cliente/ })).toHaveAttribute('href', '#document-data');
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled(); expect(provider.fetchDocumentFile).not.toHaveBeenCalled();
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    fireEvent.click(screen.getByRole('link', { name: /Falta Razón social del cliente/ }));
    expect(screen.getByLabelText(/Razón social del cliente/)).toHaveFocus();
  });
  it('previews PDF and downloads exactly the cached blob after registering its hash', async (): Promise<void> => {
    const save: ReturnType<typeof vi.spyOn> = vi.spyOn(files, 'saveBlob').mockImplementation((): void => {});
    renderPage(); expect(await screen.findByTitle('Vista previa PDF')).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByRole('tab', { name: 'EXCEL' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor((): void => { expect(save).toHaveBeenCalledWith(blob, 'Cotizacion-COT-00007.pdf'); });
    expect(provider.registerDocumentExport).toHaveBeenCalledWith('http://api.test/api', 7, 'pdf', 'a'.repeat(64));
    expect(provider.fetchDocumentFile).toHaveBeenCalledTimes(1);
  });
  it('loads the actual workbook when the page Excel tab is clicked', async (): Promise<void> => {
    const bytes: Buffer = await readFile(`${process.cwd()}/tests/fixtures/quote-document-A1.xlsx`);
    const workbook: Blob = { arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(Uint8Array.from(bytes).buffer) } as Blob;
    vi.mocked(provider.fetchDocumentFile).mockImplementation((_api: string, _id: number, format: 'pdf' | 'xlsx'): Promise<provider.DocumentFile> => Promise.resolve({ blob: format === 'xlsx' ? workbook : blob, hash: 'a'.repeat(64), name: `preview.${format}` }));
    renderPage(); await screen.findByTitle('Vista previa PDF');
    fireEvent.click(screen.getByRole('tab', { name: 'EXCEL' }));
    expect(await screen.findByRole('tab', { name: 'Cotización' }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alcance' })).toBeInTheDocument(); expect(screen.getAllByText('9.907,39').length).toBeGreaterThan(0);
  });
  it('preserves unsaved form edits when the first download freezes the document number', async (): Promise<void> => {
    vi.spyOn(files, 'saveBlob').mockImplementation((): void => {});
    vi.mocked(provider.getDocumentState).mockResolvedValueOnce(state()).mockResolvedValue({ ...state(), data: { ...state().data, number: 'COT-00007' } });
    renderPage(); await screen.findByTitle('Vista previa PDF');
    fireEvent.change(screen.getByLabelText(/Persona de contacto/), { target: { value: 'Contacto sin guardar' } }); fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor((): void => { expect(provider.getDocumentState).toHaveBeenCalledTimes(2); });
    expect(screen.getByLabelText(/Persona de contacto/)).toHaveValue('Contacto sin guardar'); expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });
  it('keeps unsaved edits out of preview and PUTs then refetches on Guardar', async (): Promise<void> => {
    renderPage(); await screen.findByTitle('Vista previa PDF');
    fireEvent.change(screen.getByLabelText(/Persona de contacto/), { target: { value: 'Otro contacto' } });
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument(); expect(provider.fetchDocumentFile).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor((): void => { expect(provider.putDocumentData).toHaveBeenCalledWith('http://api.test/api', 7, expect.objectContaining({ clientContactName: 'Otro contacto' })); });
    await waitFor((): void => { expect(provider.getDocumentState).toHaveBeenCalledTimes(2); });
  });
  it('signs out when saving document data returns 401', async (): Promise<void> => {
    const error: HttpError = new HttpError('Sesión caducada', 401);
    vi.mocked(provider.putDocumentData).mockRejectedValue(error);
    const logout: ReturnType<typeof vi.fn<() => Promise<void>>> = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    renderWithAdmin(<Routes><Route path="/quotes/:id/document" element={<QuoteDocumentPage />} /><Route path="/login" element={<p>Acceso de prueba</p>} /></Routes>, { at: '/quotes/7/document', authProvider: { ...authProviderFor(), logout, checkError: (): Promise<void> => Promise.reject(error) } });
    await screen.findByTitle('Vista previa PDF'); fireEvent.change(screen.getByLabelText(/Persona de contacto/), { target: { value: 'Otro contacto' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor((): void => { expect(logout).toHaveBeenCalled(); });
  });
  it.each(['DOCUMENT_CHANGED', 'DOCUMENT_NOT_READY'])('refreshes and saves no file after %s', async (code: string): Promise<void> => {
    const save: ReturnType<typeof vi.spyOn> = vi.spyOn(files, 'saveBlob').mockImplementation((): void => {});
    vi.mocked(provider.registerDocumentExport).mockRejectedValue(new HttpError('Cambio', 409, { code }));
    renderPage(); await screen.findByTitle('Vista previa PDF'); fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor((): void => { expect(provider.getDocumentState).toHaveBeenCalledTimes(2); }); expect(save).not.toHaveBeenCalled();
    if (code === 'DOCUMENT_CHANGED') expect(await screen.findByText('La cotización cambió. Revisa la vista previa actualizada.')).toBeInTheDocument();
  });
  it('drops bytes and refreshes when the file hash differs from state', async (): Promise<void> => {
    vi.mocked(provider.fetchDocumentFile).mockResolvedValue({ blob, hash: 'b'.repeat(64), name: 'changed.pdf' });
    renderPage(); await screen.findByText('No se pudo generar la vista previa.'); expect(screen.queryByTitle('Vista previa PDF')).not.toBeInTheDocument(); expect(provider.getDocumentState).toHaveBeenCalledTimes(2);
  });
  it('asks before downloading a quote whose margin is below minimum', async (): Promise<void> => {
    vi.mocked(provider.getDocumentState).mockResolvedValue({ ...state(), warnings: [{ code: 'MARGIN_BELOW_MINIMUM' }] });
    const confirm: ReturnType<typeof vi.spyOn> = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage(); await screen.findByTitle('Vista previa PDF'); fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(confirm).toHaveBeenCalledWith('El margen está bajo el mínimo. ¿Descargar de todos modos?'); expect(provider.registerDocumentExport).not.toHaveBeenCalled();
  });
  it('shows history and indicates when the current content is a new revision', async (): Promise<void> => {
    vi.mocked(provider.getDocumentState).mockResolvedValue({ ...state(), revision: 2 }); vi.mocked(provider.getDocumentExports).mockResolvedValue([exported]);
    renderPage(); expect(await screen.findByText('nueva revisión: cambió desde la última descarga')).toBeInTheDocument(); expect(screen.getByText(/Rev. 1 · PDF · ana@example.test/)).toBeInTheDocument();
  });
  it('shows the no-viewer fallback', async (): Promise<void> => {
    Object.defineProperty(navigator, 'pdfViewerEnabled', { configurable: true, value: false });
    renderPage(); expect(await screen.findByText('Este navegador no puede mostrar PDF. Descárgalo para verlo.')).toBeInTheDocument();
    Object.defineProperty(navigator, 'pdfViewerEnabled', { configurable: true, value: true });
  });
});
describe('document settings and actual workbook preview', (): void => {
  it('shows a failed workbook load and lets the user retry', async (): Promise<void> => {
    const file: Blob = { arrayBuffer: (): Promise<ArrayBuffer> => Promise.reject(new Error('Lectura fallida')) } as Blob;
    renderWithAdmin(<XlsxPreview contentHash="failure" blob={file} />);
    expect(await screen.findByText('No se pudo generar la vista previa.')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
  it('renders the actual API workbook with merged cells, Spanish amounts and its logo', async (): Promise<void> => {
    const bytes: Buffer = await readFile(`${process.cwd()}/tests/fixtures/quote-document-A1.xlsx`);
    const file: Blob = { arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(Uint8Array.from(bytes).buffer) } as Blob;
    renderWithAdmin(<XlsxPreview contentHash="fixture-a1" blob={file} />);
    expect(await screen.findByRole('tab', { name: 'Cotización' }, { timeout: 20000 })).toBeInTheDocument(); expect(screen.getByRole('tab', { name: 'Alcance' })).toBeInTheDocument();
    expect(screen.getAllByText('9.907,39').length).toBeGreaterThan(0); expect(screen.getByRole('img', { name: 'Logo de la empresa' })).toHaveAttribute('src', expect.stringContaining('data:image/png'));
    expect(document.querySelector('td[colspan="6"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Alcance' })); expect(screen.getByRole('table', { name: 'Alcance' })).toBeInTheDocument();
  });
  it.each([
    ['/company', <CompanySettings key="company" />, ['Logo y colores', 'Datos de la empresa', 'Razón social', 'Representante legal', 'Cargo'], ['Numeración y validez', 'Términos generales']],
    ['/template', <TemplateSettings key="template" />, ['Numeración y validez', 'Textos', 'Términos generales', 'Forma de pago predeterminada'], ['Razón social', 'Representante legal', 'Logo y colores']],
  ])('smoke renders %s with its own settings only', async (path: string, page: ReactElement, shown: string[], hidden: string[]): Promise<void> => {
    // The logo is fetched apart from the record; this company has none yet.
    vi.stubGlobal('fetch', vi.fn((): Promise<Response> => Promise.resolve(new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Logo not found' }), { status: 404 }))));
    const dataProvider: DataProvider = testDataProvider({ getOne: <R extends RaRecord>(_r: string, p: GetOneParams<R>): Promise<GetOneResult<R>> => Promise.resolve({ data: { id: p.id, tradeName: 'CleanCode', numberPrefix: 'COT', validityDays: 30, paperSize: 'A4', brandColor: '#4F46E5' } as unknown as R }) });
    renderWithAdmin(<Routes><Route path={path} element={page} /></Routes>, { at: path, dataProvider });
    expect(await screen.findByText(shown[0])).toBeInTheDocument();
    for (const text of shown) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    for (const text of hidden) expect(screen.queryByText(text)).not.toBeInTheDocument();
  });
  it('puts Logo y colores last on Empresa, after the company data and its representative', async (): Promise<void> => {
    vi.stubGlobal('fetch', vi.fn((): Promise<Response> => Promise.resolve(new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Logo not found' }), { status: 404 }))));
    const dataProvider: DataProvider = testDataProvider({ getOne: <R extends RaRecord>(_r: string, p: GetOneParams<R>): Promise<GetOneResult<R>> => Promise.resolve({ data: { id: p.id, tradeName: 'CleanCode', brandColor: '#4F46E5' } as unknown as R }) });
    renderWithAdmin(<Routes><Route path="/company" element={<CompanySettings />} /></Routes>, { at: '/company', dataProvider });
    expect(await screen.findByText('Logo y colores')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading: HTMLElement): string | null => heading.textContent)).toEqual(['Datos de la empresa', 'Representante legal', 'Logo y colores']);
  });
});
