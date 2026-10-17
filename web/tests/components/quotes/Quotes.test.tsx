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
import type { EngineResult, Quote, QuotePreview, SummaryEdits, WasteControl, ZoneInput } from '../../../src/types/quotes';
import clinic from '../../fixtures/quotes/clinic.json';
import apartment from '../../fixtures/quotes/apartment.json';
import geometry from '../../fixtures/two-room-apartment.geometry.json';
import { formatCurrency } from '../../../src/utils/format';
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
        for (const name of ['Detallado', 'Zonas', 'Oferta técnica', 'Plan de compras', 'Tarifa plana', 'Control de mermas', 'Supuestos', 'Resumen']) {
            fireEvent.click(screen.getByRole('tab', { name }));
            expect(screen.getByRole('tabpanel', { name })).toBeInTheDocument();
        }
    });
    /** A preview as the API gives it: prices from the target price, staff from the people, the rest as calculated. */
    const previewOf = (edits: SummaryEdits): QuotePreview => {
        const result: EngineResult = structuredClone(quote.result!);
        const errors: QuotePreview['errors'] = {};
        if (typeof edits.targetPrice === 'number') {
            if (edits.targetPrice < result.costs.totalCost) errors.targetPrice = 'belowCost';
            else Object.assign(result.pricing, { targetPrice: edits.targetPrice, offeredPrice: edits.targetPrice, targetMargin: 1 - result.costs.totalCost / edits.targetPrice, margin: 1 - result.costs.totalCost / edits.targetPrice, isCustomMargin: true });
        }
        if (typeof edits.peopleToHire === 'number') Object.assign(result.staffing, { peopleToHire: edits.peopleToHire, fte: edits.peopleToHire, isCustomWorkers: true });
        if (typeof edits.laborHourlyRate === 'number') Object.assign(result.staffing, { laborHourlyRate: edits.laborHourlyRate });
        return { manualPrice: null, targetMargin: null, overrides: {}, result, errors };
    };
    it('changes the target price in place, previews it from the API and recalculates this quote with it', async (): Promise<void> => {
        const sent: Partial<Quote>[] = [];
        const dataProvider: DataProvider = provider();
        dataProvider.update = <R extends RaRecord>(_resource: string, params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent.push(params.data as Partial<Quote>); return Promise.resolve({ data: { ...quote, id: params.id } as unknown as R }); };
        dataProvider.quoteAction = vi.fn();
        dataProvider.previewQuote = vi.fn((_id: number, edits: SummaryEdits): Promise<QuotePreview> => Promise.resolve(previewOf(edits)));
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider });
        fireEvent.click(await screen.findByRole('tab', { name: 'Detallado' }));
        const target: HTMLElement = await screen.findByRole('spinbutton', { name: 'Precio objetivo' });
        expect(target).toHaveValue(9907.39);
        expect(screen.getByRole('spinbutton', { name: 'Margen objetivo sobre venta' })).toHaveValue(35);
        expect(screen.getByText('General: 35,0 %')).toBeInTheDocument();
        fireEvent.change(target, { target: { value: '5000' } });
        expect(await screen.findByText('Bajo el punto de equilibrio.')).toBeInTheDocument();
        expect(dataProvider.previewQuote).toHaveBeenLastCalledWith(1, { targetPrice: 5000 });
        const bar: HTMLElement = screen.getByText(/^Valores modificados/).closest('[role="alert"]')!;
        expect(within(bar).getByRole('button', { name: 'Recalcular' })).toBeDisabled();
        fireEvent.click(within(bar).getByRole('button', { name: 'Descartar' }));
        expect(screen.getByRole('spinbutton', { name: 'Precio objetivo' })).toHaveValue(9907.39);
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio objetivo' }), { target: { value: '12879.61' } });
        // Resultado mensual and the margin follow the new target price before anything is saved.
        await waitFor((): void => { expect(screen.getByRole('spinbutton', { name: 'Margen objetivo sobre venta' })).toHaveValue(50); });
        expect(screen.getByRole('spinbutton', { name: 'Precio sin IVA' })).toHaveValue(12879.61);
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio sin IVA' }), { target: { value: '' } });
        fireEvent.click(within(screen.getByText(/^Valores modificados/).closest('[role="alert"]')!).getByRole('button', { name: 'Recalcular' }));
        await waitFor((): void => { expect(sent).toHaveLength(1); });
        expect(sent[0]).toEqual({ edits: { targetPrice: 12879.61, offeredPrice: null } });
        expect(dataProvider.quoteAction).not.toHaveBeenCalled();
        await waitFor((): void => { expect(screen.queryByText(/^Valores modificados/)).not.toBeInTheDocument(); });
    });
    it('makes every Detallado value editable, and sets the people and the price per hour', async (): Promise<void> => {
        const dataProvider: DataProvider = provider();
        dataProvider.previewQuote = vi.fn((_id: number, edits: SummaryEdits): Promise<QuotePreview> => Promise.resolve(previewOf(edits)));
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider });
        fireEvent.click(await screen.findByRole('tab', { name: 'Detallado' }));
        await screen.findByRole('spinbutton', { name: 'Precio objetivo' });
        for (const name of ['IVA', 'Total con IVA', 'Ganancia mensual', 'Margen', 'Ganancia anual', 'Precio por m²', 'Mano de obra', 'Químicos teóricos', 'Costo directo', 'Supervisión', 'Administración', 'Contingencia', 'Indirectos a distribuir', 'Precio mínimo', 'Punto de equilibrio', 'Margen para negociar', 'Personas que trabajan', 'Horas-persona', 'Personal (FTE)', 'Supervisores equivalentes', 'Merma estimada sin control', 'Fracción del costo'])
            expect(screen.getAllByRole('spinbutton', { name }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('switch', { name: 'Máquinas' })).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Personas que trabajan' }), { target: { value: '4' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio por hora de mano de obra' }), { target: { value: '5' } });
        await waitFor((): void => { expect(dataProvider.previewQuote).toHaveBeenLastCalledWith(1, { peopleToHire: 4, laborHourlyRate: 5 }); });
        await waitFor((): void => { expect(screen.getByRole('spinbutton', { name: 'Personal (FTE)' })).toHaveValue(4); });
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
    it('sets a zone\'s machines and its floor to clean, from the floor without objects up to the whole floor', async (): Promise<void> => {
        const current: Quote = structuredClone(apartment) as unknown as Quote;
        current.zones[0] = { ...current.zones[0], floorArea: 20, freeArea: 17.15, cleanedArea: null, machines: 0 };
        let sent: Partial<Quote> | undefined;
        const dataProvider: DataProvider = provider(current);
        dataProvider.update = <R extends RaRecord>(_resource: string, params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent = params.data as Partial<Quote>; return Promise.resolve({ data: { ...current, ...params.data, id: params.id } as unknown as R }); };
        renderWithAdmin(<Routes><Route path="/quotes/:id/*" element={<QuoteEdit/>}/><Route path="*" element={<CurrentRoute/>}/></Routes>, { resource: 'quotes', at: '/quotes/1', dataProvider });
        fireEvent.click(await screen.findByRole('tab', { name: 'Zonas' }));
        expect(await screen.findByText(/^17,15\s\/\s20,00\sm²$/)).toBeInTheDocument();
        const sliders: HTMLElement[] = screen.getAllByRole('slider', { name: 'Superficie a limpiar (m²)' });
        expect(sliders[0]).toHaveValue('17.15');
        fireEvent.change(sliders[0], { target: { value: '12.5' } });
        expect(screen.getByText(/^12,50\s\/\s20,00\sm²$/)).toBeInTheDocument();
        fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Máquinas' })[0], { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
        await waitFor((): void => { expect(sent?.zones?.[0]).toMatchObject({ cleanedArea: 12.5, machines: 2, freeArea: 17.15 }); });
    });
    it('removes only the zone asked for, and has no button that empties the list', async (): Promise<void> => {
        let sent: Partial<Quote> | undefined;
        const dataProvider: DataProvider = provider();
        dataProvider.update = <R extends RaRecord>(_resource: string, params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent = params.data as Partial<Quote>; return Promise.resolve({ data: { ...quote, ...params.data, id: params.id } as unknown as R }); };
        renderWithAdmin(<Routes><Route path="/quotes/:id/*" element={<QuoteEdit/>}/></Routes>, { resource: 'quotes', at: '/quotes/1', dataProvider });
        fireEvent.click(await screen.findByRole('tab', { name: 'Zonas' }));
        const removes: HTMLElement[] = await screen.findAllByRole('button', { name: 'Quitar' });
        expect(removes).toHaveLength(quote.zones.length);
        expect(screen.queryByRole('button', { name: 'Vaciar la lista' })).not.toBeInTheDocument();
        fireEvent.click(removes[1]);
        await waitFor((): void => { expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(quote.zones.length - 1); });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
        await waitFor((): void => { expect(sent?.zones?.map((z: ZoneInput): number | undefined => z.id)).toEqual(quote.zones.filter((_z: ZoneInput, i: number): boolean => i !== 1).map((z: ZoneInput): number | undefined => z.id)); });
    });
    it('opens on the Resumen tab: the plan in the zones\' colours, and the parameters that move the price, previewed and saved', async (): Promise<void> => {
        const current: Quote = structuredClone(apartment) as unknown as Quote;
        vi.stubGlobal('fetch', vi.fn((): Promise<Response> => Promise.resolve(new Response(JSON.stringify(geometry), { status: 200 }))));
        const sent: Partial<Quote>[] = [];
        const dataProvider: DataProvider = provider(current);
        dataProvider.update = <R extends RaRecord>(_resource: string, params: UpdateParams<R>): Promise<UpdateResult<R>> => { sent.push(params.data as Partial<Quote>); return Promise.resolve({ data: { ...current, id: params.id } as unknown as R }); };
        dataProvider.previewQuote = vi.fn((): Promise<QuotePreview> => Promise.resolve({ manualPrice: null, targetMargin: null, overrides: {}, result: { ...current.result!, pricing: { ...current.result!.pricing, offeredPrice: 300 } }, errors: {} }));
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider });
        const panel: HTMLElement = await screen.findByRole('tabpanel', { name: 'Resumen' });
        // The DOM's text is matched with plain spaces; the currency comes with a non-breaking one.
        const money = (value: number): string => formatCurrency(value, 'USD').replace(/\s/gu, ' ');
        expect(within(panel).getByText(money(current.result!.pricing.offeredPrice))).toBeInTheDocument();
        expect(screen.getByText('Total 34 m²')).toBeInTheDocument();
        expect(screen.getByText('mínimo 30 % · objetivo 35 %')).toBeInTheDocument();
        const plan: HTMLElement = await screen.findByRole('img', { name: /con sus zonas/ });
        // Choosing a room chooses its zone: its frequency and machines change it alone.
        fireEvent.click(within(plan).getByRole('button', { name: 'Dormitorio' }));
        expect(within(screen.getByRole('group', { name: 'Zona a ajustar' })).getByRole('button', { name: 'Dormitorio', pressed: true })).toBeInTheDocument();
        expect(within(plan).getByRole('button', { name: 'Dormitorio', pressed: true })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Mensual' }));
        fireEvent.click(screen.getByRole('button', { name: 'Más máquinas' }));
        fireEvent.change(screen.getByRole('slider', { name: 'Merma objetivo de químicos' }), { target: { value: 10 } });
        // Back to the whole quote: the floor to clean is set in every zone.
        fireEvent.click(within(screen.getByRole('group', { name: 'Zona a ajustar' })).getByRole('button', { name: 'Total' }));
        fireEvent.change(screen.getByRole('slider', { name: 'Área limpiable' }), { target: { value: 50 } });
        expect(screen.getByText('17 m² a limpiar')).toBeInTheDocument();
        const zones: object[] = [{ id: 1, cleanedArea: 10 }, { id: 2, daysPerMonth: 1, machines: 1, cleanedArea: 7 }];
        await waitFor((): void => { expect(dataProvider.previewQuote).toHaveBeenLastCalledWith(1, { targetWasteRate: 0.1 }, zones); });
        expect(await within(panel).findByText(money(300))).toBeInTheDocument();
        fireEvent.click(within(screen.getByText(/^Cambios sin guardar/).closest('[role="alert"]')!).getByRole('button', { name: 'Recalcular' }));
        await waitFor((): void => { expect(sent).toEqual([{ zones, edits: { targetWasteRate: 0.1 } }]); });
        await waitFor((): void => { expect(screen.queryByText(/^Cambios sin guardar/)).not.toBeInTheDocument(); });
        vi.unstubAllGlobals();
    });
    it('shows each room of the plan with its zone\'s monthly cost, and opens the zone chosen', async (): Promise<void> => {
        const current: Quote = structuredClone(apartment) as unknown as Quote;
        const fetchMock: ReturnType<typeof vi.fn> = vi.fn((): Promise<Response> => Promise.resolve(new Response(JSON.stringify(geometry), { status: 200 })));
        vi.stubGlobal('fetch', fetchMock);
        // Opening a zone scrolls to it, which jsdom doesn't do.
        Element.prototype.scrollIntoView = vi.fn();
        renderWithAdmin(<Routes><Route path="/quotes/:id/show" element={<QuoteShow />} /></Routes>, { resource: 'quotes', at: '/quotes/1/show', dataProvider: provider(current) });
        fireEvent.click(await screen.findByRole('tab', { name: 'Plano' }));
        const plan: HTMLElement = await screen.findByRole('img', { name: /costo mensual de cada zona/ });
        for (const [i, zone] of current.zones.entries()) {
            const room: HTMLElement = within(plan).getByRole('button', { name: new RegExp(`^${zone.name}: `) });
            expect(room).toHaveAccessibleName(`${zone.name}: ${formatCurrency(current.result!.zones[i].totalCost, 'USD')}`);
        }
        expect(screen.getByText('Costo mensual por zona')).toBeInTheDocument();
        fireEvent.click(within(plan).getByRole('button', { name: new RegExp(`^${current.zones[1].name}: `) }));
        expect(await screen.findByRole('tabpanel', { name: 'Zonas' })).toBeInTheDocument();
        vi.unstubAllGlobals();
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
