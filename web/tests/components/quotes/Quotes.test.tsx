import type { ReactElement } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { testDataProvider, type DataProvider, type RaRecord, type GetOneParams, type GetOneResult, type GetListResult, type GetManyResult, type UpdateParams, type UpdateResult } from 'react-admin';
import { renderWithAdmin } from '../../renderWithAdmin';
import { CalculationProgress } from '../../../src/quotes/QuoteShow';
import { QuoteShow } from '../../../src/quotes/QuoteShow';
import { QuoteList } from '../../../src/quotes/QuoteList';
import { QuoteEdit } from '../../../src/quotes/QuoteEdit';
import { CatalogEdit, CatalogList, ParametersEdit } from '../../../src/quotes/Settings';
import { StateChip } from '../../../src/quotes/Chips';
import type { Quote, WasteControl, ZoneInput } from '../../../src/types/quotes';
import clinic from '../../fixtures/quotes/clinic.json';
import apartment from '../../fixtures/quotes/apartment.json';
const quote: Quote = clinic as unknown as Quote;
const parameters: RaRecord = { id: 1, ...quote.snapshot!.parameters, notes: {} };
function records(resource: string): RaRecord[] {
    if (resource === 'measurements') return [{ id:1,rooms:[] }];
    if (resource === 'quotes')
        return [quote];
    if (resource === 'quote-parameters')
        return [parameters];
    if (resource === 'quote-zone-types')
        return Object.values(quote.snapshot!.zoneTypes);
    if (resource === 'quote-schedules')
        return Object.values(quote.snapshot!.schedules);
    if (resource === 'quote-products')
        return Object.values(quote.snapshot!.products);
    if (resource === 'quote-location-types')
        return [{ id: 1, label: 'Baño', locationType: 'bathroom', zoneTypeId: 5 }];
    return [];
}
function provider(current: Quote = quote): DataProvider {
    return testDataProvider({
        getOne: <R extends RaRecord>(resource: string, params: GetOneParams<R>): Promise<GetOneResult<R>> => Promise.resolve({ data: (resource === 'quotes' ? current : resource === 'measurements' ? { id:1,rooms:(apartment as unknown as Quote).zones.map((z: ZoneInput): object => ({ id:z.roomId,floorArea:z.floorArea })) } : records(resource).find((r: RaRecord): boolean => r.id === Number(params.id)) ?? parameters) as R }),
        getList: <R extends RaRecord>(resource: string): Promise<GetListResult<R>> => Promise.resolve({ data: records(resource) as R[], total: records(resource).length }),
        getMany: <R extends RaRecord>(resource: string): Promise<GetManyResult<R>> => Promise.resolve({ data: records(resource) as R[] }),
        getWaste: (): Promise<WasteControl> => Promise.resolve({ period: '2026-11', rows: [], totalExcessCost: 0 }),
    });
}
function CurrentRoute(): ReactElement { return <output data-testid="route">{useLocation().pathname}</output>; }
afterEach((): void => { vi.useRealTimers(); });
describe('quote screens', (): void => {
    it.each([['simulation', quote], ['needsReview', apartment as unknown as Quote]] as const)('renders all show tabs for %s', async (_status: string, current: Quote): Promise<void> => {
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider: provider(current) });
        expect(await screen.findByRole('heading', { name: current.name })).toBeInTheDocument();
        if (current.status === 'needsReview')
            expect(screen.getByText('Revisar datos: esta cotización es preliminar.')).toBeInTheDocument();
        for (const name of ['Zonas', 'Oferta técnica', 'Plan de compras', 'Tarifa plana', 'Control de mermas', 'Supuestos', 'Resumen']) {
            fireEvent.click(screen.getByRole('tab', { name }));
            expect(screen.getByRole('tabpanel', { name })).toBeInTheDocument();
        }
    });
    it('changes the target price in place and recalculates this quote at its own margin', async (): Promise<void> => {
        const sent: Partial<Quote>[] = [];
        const dataProvider: DataProvider = provider();
        dataProvider.update = <R extends RaRecord>(_resource: string, params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent.push(params.data as Partial<Quote>); return Promise.resolve({ data: { ...quote, ...params.data, id: params.id } as unknown as R }); };
        dataProvider.quoteAction = vi.fn();
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider });
        const target: HTMLElement = await screen.findByRole('spinbutton', { name: 'Precio objetivo' });
        expect(target).toHaveValue(9907.39);
        expect(screen.getByRole('spinbutton', { name: 'Margen objetivo sobre venta' })).toHaveValue(35);
        expect(screen.getByText('General: 35,0 %')).toBeInTheDocument();
        fireEvent.change(target, { target: { value: '5000' } });
        expect(await screen.findByText('Bajo el punto de equilibrio.')).toBeInTheDocument();
        const bar: HTMLElement = screen.getByText(/^Precios modificados/).closest('[role="alert"]')!;
        expect(within(bar).getByRole('button', { name: 'Recalcular' })).toBeDisabled();
        fireEvent.click(within(bar).getByRole('button', { name: 'Descartar' }));
        expect(screen.getByRole('spinbutton', { name: 'Precio objetivo' })).toHaveValue(9907.39);
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio objetivo' }), { target: { value: '12879.61' } });
        // Resultado mensual and the margin follow the new target price before anything is saved.
        expect(screen.getByRole('spinbutton', { name: 'Margen objetivo sobre venta' })).toHaveValue(50);
        expect(screen.getByRole('spinbutton', { name: 'Precio sin IVA' })).toHaveValue(12879.61);
        expect(screen.getAllByText('50,0 %').length).toBeGreaterThan(0);
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio sin IVA' }), { target: { value: '' } });
        fireEvent.click(within(screen.getByText(/^Precios modificados/).closest('[role="alert"]')!).getByRole('button', { name: 'Recalcular' }));
        await waitFor((): void => { expect(sent).toHaveLength(1); });
        expect(Object.keys(sent[0]).sort()).toEqual(['manualPrice', 'targetMargin']);
        expect(sent[0].manualPrice).toBeNull();
        expect(sent[0].targetMargin).toBeCloseTo(.5, 6);
        expect(dataProvider.quoteAction).not.toHaveBeenCalled();
        await waitFor((): void => { expect(screen.queryByText(/^Precios modificados/)).not.toBeInTheDocument(); });
    });
    it.each([['quotes', <QuoteList />, '/quotes'], ['quotes', <QuoteEdit />, '/quotes/1'], ['quote-parameters', <ParametersEdit />, '/quote-parameters/1']] as const)('smoke renders %s %s', async (resource: string, view: ReactElement, at: string): Promise<void> => { renderWithAdmin(<Routes><Route path={at.replace('/1','/:id')} element={view} /></Routes>, { resource, at, dataProvider: provider() });  expect(await screen.findByText(resource === 'quotes' && at === '/quotes' ? 'Clínica de prueba' : resource === 'quotes' ? 'Datos del caso' : 'Mano de obra')).toBeInTheDocument(); });
    it.each(['quote-zone-types', 'quote-schedules', 'quote-products', 'quote-location-types'])('smoke renders catalog list and edit %s', async (resource: string): Promise<void> => { const rendered: ReturnType<typeof renderWithAdmin> = renderWithAdmin(<CatalogList resource={resource}/>, { resource, at: `/${resource}`, dataProvider: provider() }); await screen.findAllByRole('row'); rendered.unmount(); renderWithAdmin(<Routes><Route path={`/${resource}/:id`} element={<CatalogEdit resource={resource}/>} /></Routes>, { resource, at: `/${resource}/1`, dataProvider: provider() }); expect(await screen.findByRole('button', { name: /Guardar/ })).toBeInTheDocument(); });
    it('shows the original scanned floor area beside an edited zone',async (): Promise<void> => {
        const current: Quote = structuredClone(apartment) as unknown as Quote;
        current.zones[0].floorArea = 99;
        renderWithAdmin(<Routes><Route path="/quotes/:id" element={<QuoteEdit/>}/></Routes>,{ resource:'quotes',at:'/quotes/1',dataProvider:provider(current) });
        expect(await screen.findByText(/Escaneo: 20,00 m²/)).toBeInTheDocument();
    });
    it.each([[false, 'Confirmar', true], [true, 'Quitar confirmación', false]] as const)('confirmed %s: %s saves assumptionsConfirmed %s', async (confirmed: boolean, label: string, expected: boolean): Promise<void> => {
        const current: Quote = { ...structuredClone(apartment) as unknown as Quote, assumptionsConfirmed: confirmed };
        let sent: Partial<Quote> | undefined;
        const dataProvider: DataProvider = provider(current);
        dataProvider.update = <R extends RaRecord>(_resource: string,params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent = params.data as Partial<Quote>; return Promise.resolve({ data:{ ...current,...params.data,id:params.id } as unknown as R }); };
        renderWithAdmin(<Routes><Route path="/quotes/:id" element={<QuoteEdit/>}/><Route path="*" element={<CurrentRoute/>}/></Routes>,{ resource:'quotes',at:'/quotes/1',dataProvider });
        fireEvent.click(await screen.findByRole('button',{ name:label }));
        await waitFor((): void => { expect(sent?.assumptionsConfirmed).toBe(expected); });
    });
    it('keeps the singleton parameter route after saving',async (): Promise<void> => {
        let saved: boolean = false;
        const dataProvider: DataProvider = provider();
        dataProvider.update = <R extends RaRecord>(_resource: string,params: UpdateParams<R>): Promise<UpdateResult<R>> => { saved = true;return Promise.resolve({ data:{ ...parameters,...params.data,id:params.id } as R }); };
        renderWithAdmin(<Routes><Route path="/quote-parameters/:id" element={<><ParametersEdit/><CurrentRoute/></>}/><Route path="*" element={<CurrentRoute/>}/></Routes>,{ resource:'quote-parameters',at:'/quote-parameters/1',dataProvider });
        // The margin lives in its own tab; the other tabs' inputs are hidden until theirs is open.
        fireEvent.click(await screen.findByRole('tab',{ name:'Margen e impuestos' }));
        const margin: HTMLElement = await screen.findByRole('spinbutton',{ name:'Margen objetivo sobre venta' });
        fireEvent.change(margin,{ target:{ value:'40' } });
        fireEvent.click(screen.getByRole('button',{ name:/Guardar/ }));
        await waitFor((): void => { expect(saved).toBe(true); });
        expect(screen.getByTestId('route')).toHaveTextContent('/quote-parameters/1');
    });
    it('polls pending calculations and stops when done', async (): Promise<void> => { vi.useFakeTimers(); const refetch: Mock<() => void> = vi.fn<() => void>(); const rendered: ReturnType<typeof renderWithAdmin> = renderWithAdmin(<CalculationProgress state="pending" refetch={refetch}/>); await act(async (): Promise<void> => { await vi.advanceTimersByTimeAsync(61000); }); expect(refetch).toHaveBeenCalledTimes(61); expect(screen.getByText('El cálculo está tardando más de lo normal.')).toBeInTheDocument(); rendered.rerender(<CalculationProgress state="done" refetch={refetch}/>); await act(async (): Promise<void> => { await vi.advanceTimersByTimeAsync(3000); }); expect(refetch).toHaveBeenCalledTimes(61); });
    it.each([['healthy', 'Saludable'], ['acceptable', 'Aceptable'], ['belowMinimum', 'Bajo el mínimo'], ['loss', 'Pérdida'], ['watch', 'Vigilar'], ['alert', 'Alerta']])('renders %s chip', (value: string, label: string): void => { renderWithAdmin(<StateChip value={value}/>); expect(screen.getByText(label)).toBeInTheDocument(); });
});
