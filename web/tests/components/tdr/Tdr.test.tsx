import { Route, Routes, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';
import { testDataProvider, type DataProvider, type GetListResult, type GetManyResult, type GetOneResult, type RaRecord, type UpdateParams, type UpdateResult } from 'react-admin';
import TdrStatusBadge from '../../../src/components/tdr/TdrStatusBadge';
import TdrEdit from '../../../src/resources/tdr-documents/TdrEdit';
import type { TdrDocument, TdrExtraction } from '../../../src/types/tdr';
import { renderWithAdmin } from '../../renderWithAdmin';

const extraction: TdrExtraction = {
  title: 'Limpieza hospitalaria', summary: 'Servicio 24 horas.', city: 'Quito', installationType: 'publicHospital', referencePrice: 93507.74,
  contractMonths: 12, paymentTerms: 'Mensual', totalArea: 28000, serviceHours: '24 horas, 365 días',
  client: { legalName: 'Hospital General', taxId: null, contactName: null, contactTitle: null, email: null, phone: null, address: null },
  zones: [{ name: 'UCI', risk: 'critical', zoneTypeId: 9, scheduleId: 4, floorArea: null, fixedPosts: 1, hoursPerDay: 24, daysPerMonth: 30.4, notes: null }],
  staff: [{ role: 'Auxiliar de limpieza', count: 86, notes: null }], equipment: [], supplies: [], requirements: [{ text: 'Garantía del 5 %' }],
};
const base: TdrDocument = {
  id: 7, fileName: 'ficha.pdf', contentType: 'application/pdf', size: 1000, status: 'done', error: null, errorDetail: null, attempts: 1,
  model: 'anthropic/claude-haiku-5.5', title: 'Limpieza hospitalaria', zoneCount: 1, quoteId: null, analyzedAt: '2026-10-17T12:00:00Z',
  createdBy: 'ana@example.com', createdAt: '2026-10-17T12:00:00Z', updatedAt: '2026-10-17T12:00:00Z', extraction,
};
const catalogs: Record<string, RaRecord[]> = {
  'quote-zone-types': [{ id: 9, name: 'UCI' }],
  'quote-schedules': [{ id: 4, name: '24/7' }],
};

function CurrentRoute(): ReactElement {
  return <output data-testid="route">{useLocation().pathname}</output>;
}

function renderEdit(doc: TdrDocument, extra: Partial<DataProvider> = {}): DataProvider {
  const provider: DataProvider = testDataProvider({
    getOne: <R extends RaRecord>(): Promise<GetOneResult<R>> => Promise.resolve({ data: doc as unknown as R }),
    getList: <R extends RaRecord>(resource: string): Promise<GetListResult<R>> => Promise.resolve({ data: (catalogs[resource] ?? []) as R[], total: catalogs[resource]?.length ?? 0 }),
    getMany: <R extends RaRecord>(resource: string): Promise<GetManyResult<R>> => Promise.resolve({ data: (catalogs[resource] ?? []) as R[] }),
    update: <R extends RaRecord>(_resource: string, params: UpdateParams): Promise<UpdateResult<R>> => Promise.resolve({ data: { ...doc, ...params.data } as unknown as R }),
    ...extra,
  });
  renderWithAdmin(
    <Routes>
      <Route path="/tdr-documents/:id/*" element={<TdrEdit />} />
      <Route path="/quotes/:id/show" element={<CurrentRoute />} />
    </Routes>,
    { resource: 'tdr-documents', at: '/tdr-documents/7', dataProvider: provider },
  );
  return provider;
}

describe('TdrStatusBadge', () => {
  it('names each state, with a spinner while it works', (): void => {
    renderWithAdmin(<><TdrStatusBadge status="pending" /><TdrStatusBadge status="running" /><TdrStatusBadge status="done" /><TdrStatusBadge status="failed" /></>);
    for (const label of ['En cola', 'Analizando', 'Listo', 'Error']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar', { hidden: true })).toHaveLength(2);
  });
});

describe('TdrEdit', () => {
  it('shows the progress while the document is analyzed, without the form', async (): Promise<void> => {
    renderEdit({ ...base, status: 'running', extraction: null, title: null });
    expect(await screen.findByText(/Analizando el documento con IA/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ficha.pdf' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('says why an analysis failed, and Reintentar queues it again', async (): Promise<void> => {
    const analyzeTdr: Mock<() => Promise<TdrDocument>> = vi.fn((): Promise<TdrDocument> => Promise.resolve({ ...base, status: 'pending' }));
    renderEdit({ ...base, status: 'failed', error: 'OPENROUTER_API_KEY_MISSING', errorDetail: 'OPENROUTER_API_KEY is not set', extraction: null }, { analyzeTdr });
    expect(await screen.findByText(/Falta configurar OPENROUTER_API_KEY/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor((): void => expect(analyzeTdr).toHaveBeenCalledWith(7));
  });

  it('shows the extracted information in tabs to edit', async (): Promise<void> => {
    renderEdit(base);
    expect(await screen.findByDisplayValue('Limpieza hospitalaria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Quito')).toBeInTheDocument();
    for (const name of ['Cliente', 'Zonas', 'Personal y equipos', 'Insumos', 'Requisitos']) expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Zonas' }));
    expect(await screen.findByDisplayValue('UCI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30.4')).toBeInTheDocument();
  });

  it('saves, then creates the quote and opens it', async (): Promise<void> => {
    const createTdrQuote: Mock<() => Promise<RaRecord>> = vi.fn((): Promise<RaRecord> => Promise.resolve({ id: 12 }));
    const provider: DataProvider = renderEdit(base, { createTdrQuote });
    const update: MockInstance<DataProvider['update']> = vi.spyOn(provider, 'update');
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y crear cotización' }));
    await waitFor((): void => expect(createTdrQuote).toHaveBeenCalledWith(7));
    const sent: { extraction: TdrExtraction } = update.mock.calls[0][1].data as { extraction: TdrExtraction };
    expect(update.mock.calls[0][0]).toBe('tdr-documents');
    expect(sent.extraction.title).toBe('Limpieza hospitalaria');
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(createTdrQuote.mock.invocationCallOrder[0]);
    expect(await screen.findByTestId('route')).toHaveTextContent('/quotes/12/show');
  });

  it('opens the quote once there is one, instead of creating another', async (): Promise<void> => {
    renderEdit({ ...base, quoteId: 12 });
    const header: HTMLElement = (await screen.findByRole('heading', { name: 'Limpieza hospitalaria' })).closest('header')!;
    expect(within(header).getByRole('link', { name: 'Ver cotización' })).toHaveAttribute('href', '/quotes/12/show');
    expect(screen.queryByRole('button', { name: 'Guardar y crear cotización' })).not.toBeInTheDocument();
  });
});
