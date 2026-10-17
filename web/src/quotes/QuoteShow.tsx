import DescriptionIcon from '@mui/icons-material/Description';
import { useEffect, useState, type ReactElement, type ReactNode, type ChangeEvent, type SyntheticEvent } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Link, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { DeleteButton, EditButton, Show, useDataProvider, useNotify, useRecordContext, useRedirect, useShowContext } from 'react-admin';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ConfirmButton from '../components/ConfirmButton';
import { useAppConfig } from '../AppConfigContext';
import { quoteEnums, quoteFields, quoteIssues, quoteText } from '../i18n/quotes';
import type { InventoryDataProvider } from '../types/providers';
import type { Issue, PurchasePlanRow, Quote, TechnicalOfferRow, TechnicalProduct, WasteControl, WasteRow, ZoneInput, ZoneResult, ZoneTypeValues } from '../types/quotes';
import { formatCurrency } from '../utils/format';
import { formatDateTime } from '../utils/dates';
import { QuoteStatus, StateChip } from './Chips';
import { parameterGroups } from './Settings';
import { parameterFields } from './parameterFields';
import { number, percent, previewWaste } from './format';
const tabs: string[] = [quoteText.summary, quoteText.zones, quoteText.technicalOffer, quoteText.purchasePlan, quoteText.flatRate, quoteText.wasteControl, quoteText.assumptions];
const moneyFields: Set<string> = new Set(['supervision','equipment','transport','insurance','operatingCost','administration','contingency','indirectToAllocate','monthlyWage','basicWage','supervisorMonthlyCost','baseEppPerFte','criticalEppPerFte','mopCost','equipmentMonthly','transportMonthly','insuranceMonthly','flatRatePerM2','paperSoapMonthly','defaultPaperSoapPerFixtureMonthly','offeredPrice', 'totalCost', 'profit', 'vat', 'totalWithVat', 'annualProfit', 'pricePerM2', 'targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom', 'laborCost', 'chemicalsTheoretical', 'chemicalsWaste', 'chemicalsWithWaste', 'eppAndHygiene', 'utensils', 'directCost', 'allocatedIndirect', 'costPerM2', 'purchaseCost', 'wasteCost', 'excessCost', 'withWaste', 'uncontrolledWasteCost', 'controlledWasteCost', 'monthlyWasteSavings', 'annualWasteSavings', 'revenue', 'price', 'difference', 'pricePerContainer', 'pricePerUnit']);
const percentageFields: Set<string> = new Set([...parameterFields.filter((f: typeof parameterFields[number]): boolean => f.percentage).map((f: typeof parameterFields[number]): string => f.name),'nightHoursFraction','margin', 'share', 'realWasteRate', 'relativeDifference', 'flatRateMargin', 'nightFraction', 'holidayFraction', 'shareOfCost']);
const quantityFields: Set<string> = new Set(['theoretical', 'waste', 'total', 'actual', 'excess', 'dailySolutionLiters', 'terminalSolutionLiters', 'cleaningConcentrate', 'dailyDisinfectantConcentrate', 'terminalDisinfectantConcentrate', 'solutionPerDailyCleaning']);
export const issueMessage = (issue: Issue): string => Object.entries(issue.params ?? {}).reduce((message: string, [key, value]: [
    string,
    string | number
]): string => message.replaceAll(`{${key}}`, typeof value === 'number' ? number(value) : value), quoteIssues[issue.code] ?? quoteText.reviewData);
const DisplayValue = ({ field, value }: {
    field: string;
    value: unknown;
}): ReactElement => {
    const { currency }: {
        currency: string;
    } = useAppConfig();
    if (value == null)
        return <>—</>;
    if ((field === 'status' || field === 'marginStatus') && typeof value === 'string') return <StateChip value={value}/>;
    if (typeof value === 'boolean')
        return <>{value ? quoteEnums.true : quoteEnums.false}</>;
    if (typeof value === 'number')
        return <>{moneyFields.has(field) ? formatCurrency(value, currency) : percentageFields.has(field) ? percent(value) : number(value, quantityFields.has(field) ? 3 : /Hours|hours|personHours/.test(field) ? 1 : 2)}</>;
    if (typeof value === 'object' && 'dosePerLiter' in value) {
        const p: TechnicalProduct = value as TechnicalProduct;
        return <>{p.name} · {number(p.dosePerLiter, 0)} {p.doseUnit}{quoteText.perLiter}</>;
    }
    const text: string = typeof value === 'string' ? value : '—';
    return <>{quoteEnums[text] ?? text}</>;
};
function Values({ values, title }: {
    values: object;
    title?: string;
}): ReactElement {
    return <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
    {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
    <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 1fr', gap: 1, m: 0 }}>{Object.entries(values).filter(([key]: [
        string,
        unknown
    ]): boolean => !!quoteFields[key]).map(([key, value]: [
        string,
        unknown
    ]): ReactElement => <Box key={key} sx={{ display: 'contents' }}>
    <Typography component="dt" variant="body2" color="text.secondary">{quoteFields[key]}</Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><DisplayValue field={key} value={value}/></Typography>
    </Box>)}</Box>
    </CardContent></Card>;
}
function Rows({ rows, fields, footer }: {
    rows: object[];
    fields: string[];
    footer?: ReactNode;
}): ReactElement {
    return <TableContainer sx={{ mb: 2 }}><Table size="small">
    <TableHead><TableRow>{fields.map((k: string): ReactElement => <TableCell key={k}>{quoteFields[k] ?? quoteFields.status}</TableCell>)}</TableRow></TableHead>
    <TableBody>
    {rows.map((row: object, i: number): ReactElement => <TableRow key={i}>{fields.map((k: string): ReactElement => <TableCell key={k}><DisplayValue field={k} value={(row as Record<string, unknown>)[k]}/></TableCell>)}</TableRow>)}
    {footer}
    </TableBody>
    </Table></TableContainer>;
}
export function CalculationProgress({ state, refetch }: {
    state: string;
    refetch: () => unknown;
}): ReactElement | null {
    const [slow, setSlow]: [
        boolean,
        (v: boolean) => void
    ] = useState<boolean>(false);
    const pending: boolean = state === 'pending' || state === 'running';
    useEffect((): (() => void) | undefined => { if (!pending)
        return; const timer: ReturnType<typeof setInterval> = setInterval((): void => { void refetch(); }, 1000); const timeout: ReturnType<typeof setTimeout> = setTimeout((): void => setSlow(true), 60000); return (): void => { clearInterval(timer); clearTimeout(timeout); }; }, [pending, refetch]);
    if (!pending)
        return null;
    return <Alert severity="info" icon={<CircularProgress size={18}/>}>{slow ? quoteText.slowCalculation : quoteText.calculating}</Alert>;
}
function WasteEditor({ quote }: {
    quote: Quote;
}): ReactElement {
    const [period, setPeriod]: [
        string,
        (v: string) => void
    ] = useState<string>((): string => { const d: Date = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
    const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
    const query: UseQueryResult<WasteControl> = useQuery<WasteControl>({ queryKey: ['waste', quote.id, period], queryFn: (): Promise<WasteControl> => provider.getWaste(quote.id, period), enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(period) });
    return <Box>
    <TextField type="month" label={quoteText.wasteMonth} value={period} onChange={(e: ChangeEvent<HTMLInputElement>): void => setPeriod(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ mb: 2 }}/>
    {query.isPending ? <CircularProgress /> : query.error ? <Alert severity="error">{quoteText.wasteLoadError}</Alert> : query.data && <WasteInputs key={`${period}/${query.dataUpdatedAt}`} quote={quote} data={query.data} onSaved={(): void => { void query.refetch(); }}/>}
    </Box>;
}
function WasteInputs({ quote, data, onSaved }: {
    quote: Quote;
    data: WasteControl;
    onSaved: () => void;
}): ReactElement {
    const [actuals, setActuals] = useState<Record<number, number | null>>((): Record<number, number | null> => Object.fromEntries(data.rows.map((r: WasteRow): [
        number,
        number | null
    ] => [r.productId, r.actual])));
    const [saving, setSaving]: [
        boolean,
        (v: boolean) => void
    ] = useState<boolean>(false);
    const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
    const notify: ReturnType<typeof useNotify> = useNotify();
    const preview: WasteControl = previewWaste(quote.result!.purchasePlan.rows, quote.snapshot!.parameters.targetWasteRate, actuals, data.period);
    const save = async (): Promise<void> => { setSaving(true); try {
        await provider.saveWaste(quote.id, data.period, Object.entries(actuals).map(([id, actual]: [
            string,
            number | null
        ]): {
            productId: number;
            actual: number | null;
        } => ({ productId: Number(id), actual })));
        notify(quoteText.wasteSaved);
        onSaved();
    }
    catch {
        notify(quoteText.wasteSaveError, { type: 'error' });
    }
    finally {
        setSaving(false);
    } };
    return <><TableContainer><Table size="small">
    <TableHead><TableRow>{['name', 'theoretical', 'actual', 'realWasteRate', 'excess', 'excessCost', 'status'].map((key: string): ReactElement => <TableCell key={key}>{quoteFields[key]}</TableCell>)}</TableRow></TableHead>
    <TableBody>{preview.rows.map((row: WasteRow): ReactElement => <TableRow key={row.productId}>
    <TableCell>{row.name}</TableCell>
    <TableCell>
    {number(row.theoretical, 3)}
    {row.unit}
    </TableCell>
    <TableCell><TextField size="small" type="number" label={`${quoteText.realConsumption} ${row.name} (${row.unit})`} value={actuals[row.productId] ?? ''} slotProps={{ htmlInput: { min: 0, step: 'any' } }} onChange={(event: ChangeEvent<HTMLInputElement>): void => { const raw: string = event.target.value; setActuals((previous: Record<number, number | null>): Record<number, number | null> => ({ ...previous, [row.productId]: raw === '' ? null : Number(raw) })); }}/></TableCell>
    <TableCell>{percent(row.realWasteRate)}</TableCell>
    <TableCell>{number(row.excess, 3)}</TableCell>
    <TableCell><DisplayValue field="excessCost" value={row.excessCost}/></TableCell>
    <TableCell><StateChip value={row.status}/></TableCell>
    </TableRow>)}</TableBody>
    </Table></TableContainer><Typography sx={{ my: 2 }}>{quoteText.excessTotal} <DisplayValue field="excessCost" value={preview.totalExcessCost}/></Typography><Button variant="contained" disabled={saving} onClick={save}>{quoteText.save}</Button></>;
}
const zoneGroups: [
    string,
    string[]
][] = [[quoteText.frequency, ['hoursBetweenCleanings', 'cleaningsPerDay', 'cleaningsPerMonth', 'terminalsPerMonth']], [quoteText.hours, ['dailyCleaningHours', 'terminalHours', 'taskHours', 'presenceHours', 'billableHours']], [quoteText.payrollGroup, ['nightFraction', 'holidayFraction', 'laborCost', 'fte', 'm2PerPersonInService']], [quoteFields.chemicals, ['dailySolutionLiters', 'terminalSolutionLiters', 'cleaningConcentrate', 'dailyDisinfectantConcentrate', 'terminalDisinfectantConcentrate', 'chemicalsTheoretical', 'chemicalsWithWaste']], [quoteText.costs, ['eppAndHygiene', 'utensils', 'directCost', 'allocatedIndirect', 'totalCost', 'targetPrice', 'costPerM2', 'pricePerM2']]];
const subset = (value: object, keys: string[]): Record<string, unknown> => Object.fromEntries(keys.map((k: string): [
    string,
    unknown
] => [k, (value as Record<string, unknown>)[k]]));
function ZoneDetails({ quote }: {
    quote: Quote;
}): ReactElement {
    const redirect: ReturnType<typeof useRedirect> = useRedirect();
    return <>{quote.zones.map((z: ZoneInput, i: number): ReactElement => { const result: ZoneResult = quote.result!.zones[i]; return <Accordion key={z.id} id={`zone-${z.position}`} defaultExpanded={window.location.hash === `#zone-${z.position}`}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>
    {z.name}
    {!result.active && <Chip size="small" label={quoteText.inactive} color="warning"/>}
    </Typography></AccordionSummary>
    <AccordionDetails>
    {result.causes.map((cause: Issue): ReactElement => <Alert key={cause.code} severity="warning">{issueMessage(cause)}</Alert>)}
    <Button onClick={(): void => redirect('edit', 'quotes', quote.id)}>{quoteText.editZone}</Button>
    <Typography variant="h6">{quoteText.inputsSources}</Typography>
    <Table size="small"><TableBody>{Object.entries(z).filter(([key]: [
        string,
        unknown
    ]): boolean => !!quoteFields[key] && !['id', 'position'].includes(key)).map(([key, v]: [
        string,
        unknown
    ]): ReactElement => <TableRow key={key}>
    <TableCell>{quoteFields[key]}</TableCell>
    <TableCell><DisplayValue field={key} value={key === 'zoneTypeId' ? quote.snapshot!.zoneTypes[Number(v)]?.name ?? null : key === 'scheduleId' ? quote.snapshot!.schedules[Number(v)]?.name ?? null : v}/></TableCell>
    <TableCell>{z.sources[key] && <Chip size="small" variant="outlined" label={quoteEnums[z.sources[key]]}/>}</TableCell>
    </TableRow>)}</TableBody></Table>
    {zoneGroups.map(([title, keys]: [
        string,
        string[]
    ]): ReactElement => <Values key={title} title={title} values={subset(result, keys)}/>)}
    </AccordionDetails>
    </Accordion>; })}</>;
}
export function QuoteDetail(): ReactElement | null {
    const quote: Quote | undefined = useRecordContext<Quote>();
    const { refetch } = useShowContext<Quote>();
    const [tab, setTab]: [
        number,
        (v: number) => void
    ] = useState<number>(0);
    const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
    const notify: ReturnType<typeof useNotify> = useNotify();
    if (!quote)
        return null;
    const recalculate = async (): Promise<void> => { try {
        await provider.quoteAction(quote.id, 'recalculate');
        await refetch();
    }
    catch {
        notify(quoteText.recalculateError, { type: 'error' });
    } };
    const result: Quote['result'] = quote.result;
    return <Box>
    <PageHeader eyebrow={quoteText.quotes} title={quote.name} badge={<QuoteStatus quote={quote}/>} actions={<><Button component={RouterLink} to={`/quotes/${quote.id}/document`} startIcon={<DescriptionIcon />} variant="outlined">Documento</Button><Button variant="contained" onClick={recalculate}>{quoteText.recalculate}</Button><EditButton variant="outlined"/><DeleteButton mutationMode="pessimistic"/><ConfirmButton label={quoteText.regenerate} disabled={quote.measurementId === null} confirmContent={quoteText.regenerateConfirm} onConfirm={async (): Promise<void> => { await provider.quoteAction(quote.id, 'regenerate'); await refetch(); }}/></>}/>
    <Typography color="text.secondary" sx={{ mb: 1 }}>{quoteText.notValidated}</Typography>
    {quote.measurementId !== null && <Link component={RouterLink} to={`/measurements/${quote.measurementId}/show`}>{quoteText.measurement} {quote.measurementId}</Link>}
    <Typography variant="body2">{quoteText.calculatedOn} {quote.calculation.calculatedAt ? formatDateTime(quote.calculation.calculatedAt) : '—'}</Typography>
    <CalculationProgress key={quote.calculation.inputRevision} state={quote.calculation.state} refetch={refetch}/>
    {quote.calculation.state === 'failed' && <Alert severity="error">{quoteText.calculationError} {quote.calculation.error} <Button onClick={recalculate}>{quoteText.recalculate}</Button></Alert>}
    {quote.calculation.isStale && <Alert severity="warning">{quoteText.staleBanner} <Button onClick={recalculate}>{quoteText.recalculate}</Button></Alert>}
    {quote.status === 'needsReview' && <Alert severity="warning" sx={{ my: 2 }}>
    <Typography fontWeight={600}>{quoteText.preliminary}</Typography>
    {result?.causes.map((cause: Issue, i: number): ReactElement => <Typography component="div" key={i}>
    {issueMessage(cause)}
    {cause.zoneIndex !== undefined && <Button size="small" onClick={(): void => { setTab(1); window.location.hash = `zone-${cause.zoneIndex}`; }}>{quoteText.goToZone}</Button>}
    </Typography>)}
    </Alert>}
    {result?.warnings.map((warning: Issue, i: number): ReactElement => <Alert key={i} severity="warning" sx={{ my: 1 }}>{issueMessage(warning)}</Alert>)}
        {result && <><Tabs value={tab} onChange={(_event: SyntheticEvent, value: number): void => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ my: 2 }}>{tabs.map((title: string): ReactElement => <Tab key={title} label={title}/>)}</Tabs><Box role="tabpanel" aria-label={tabs[tab]}>
        {tab === 0 && <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Box>
        <Values title={`${quoteText.monthlyResult}${result.pricing.isManualPrice ? ` ${quoteText.manualPriceSuffix}` : ''}`} values={subset(result.pricing, ['offeredPrice', 'vat', 'totalWithVat', 'profit', 'margin', 'marginStatus', 'annualProfit', 'pricePerM2'])}/>
        <Values title={quoteFields.totalCost} values={result.costs}/>
        
        </Box>
        <Box>
        <Values title={quoteText.negotiation} values={subset(result.pricing, ['targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom'])}/>
        <Alert severity="info">{quoteText.minimumAdvice}</Alert>
        <Values title={quoteText.staffing} values={result.staffing}/>
        <Typography variant="caption">{quoteText.shiftAdvice}</Typography>
        <Values title={quoteText.chemicalsGroup} values={result.chemicals}/>
        <Typography variant="caption">{quoteText.wasteHypothetical}</Typography>
        </Box>
        </Box><Typography variant="h6">{quoteText.dollarBreakdown}</Typography><Rows fields={['name', 'totalCost', 'share']} rows={result.breakdown.map((r: {
            key: string;
            amount: number;
            share: number | null;
        }): object => ({ name: quoteFields[r.key], totalCost: r.amount, share: r.share }))}/><Typography variant="h6">{quoteText.zoneBreakdown}</Typography><Rows fields={['name', 'zoneTypeName', 'risk', 'floorArea', 'fte', 'totalCost', 'targetPrice', 'pricePerM2']} rows={[...result.zones.map((z: ZoneResult, i: number): object => ({ ...z, zoneTypeName: quote.snapshot!.zoneTypes[quote.zones[i].zoneTypeId!]?.name })), { name: quoteText.grandTotal, ...result.totals }]}/></>}
        {tab === 1 && <ZoneDetails quote={quote}/>}
        {tab === 2 && <Rows rows={result.technicalOffer.map((r: TechnicalOfferRow): object => ({ ...r, hoursBetweenCleanings: `${quoteText.every} ${number(r.hoursBetweenCleanings, 0)} h · ${number(r.cleaningsPerDay, 0)} ${quoteText.perDay}`, disinfectantPerCleaning: `${number(r.disinfectantPerCleaning, 3)} ${r.dailyDisinfectant.doseUnit}` }))} fields={['name', 'zoneTypeName', 'risk', 'scheduleName', 'hoursBetweenCleanings', 'terminalsPerMonth', 'cleaningProduct', 'dailyDisinfectant', 'terminalDisinfectant', 'solutionPerDailyCleaning', 'disinfectantPerCleaning', 'fte']}/>}
        {tab === 3 && <><Rows fields={['name', 'unit', 'presentationSize', 'pricePerContainer', 'pricePerUnit', 'theoretical', 'waste', 'total', 'containers', 'stock', 'toBuy', 'purchaseCost', 'wasteCost']} rows={result.purchasePlan.rows.map((r: PurchasePlanRow): object => ({ ...r, stock: quote.snapshot!.products[r.productId]?.inventoryProductId ? `${number(r.stock, 0)} · ${quoteText.inventorySource}` : r.stock }))}/><Values title={quoteText.totals} values={{ purchaseCost: result.purchasePlan.totalPurchaseCost, wasteCost: result.purchasePlan.totalWasteCost }}/></>}
        {tab === 4 && <>{result.flatRate.rate > 0 ? <Values title={quoteText.flatRate} values={result.flatRate}/> : <Alert severity="info">{quoteText.noFlatRate}</Alert>}<Rows fields={['name', 'floorArea', 'totalCost', 'flatRateRevenue', 'flatRateMargin', 'status']} rows={result.zones.map((z: ZoneResult): object => ({ ...z, status: z.flatRateStatus }))}/>{result.reference.price ? <Values title={quoteFields.externalReferencePrice} values={result.reference}/> : <Alert severity="info">{quoteText.referencePrompt}</Alert>}</>}
        {tab === 5 && <WasteEditor quote={quote}/>}
        {tab === 6 && quote.snapshot && <><Typography variant="h6">{quoteText.snapshot}</Typography>{Object.values(quote.snapshot.zoneTypes).map((type: ZoneTypeValues): ReactElement => <Values key={type.id} title={type.name} values={{ ...type,cleaningProductId:quote.snapshot!.products[type.cleaningProductId]?.name,dailyDisinfectantId:quote.snapshot!.products[type.dailyDisinfectantId]?.name,terminalDisinfectantId:quote.snapshot!.products[type.terminalDisinfectantId]?.name,hoursBetweenLow:type.hoursBetweenCleanings.low,hoursBetweenMedium:type.hoursBetweenCleanings.medium,hoursBetweenHigh:type.hoursBetweenCleanings.high }} />)}{parameterGroups.map(([title,start,end]: [string,number,number]): ReactElement => <Values key={title} title={title} values={subset(quote.snapshot!.parameters,parameterFields.slice(start,end).map((f: typeof parameterFields[number]): string => f.name))} />)}<Rows rows={Object.values(quote.snapshot.zoneTypes)} fields={['name', 'risk', 'dailyRateM2PerHour', 'terminalRateM2PerHour', 'solutionLitersPerM2']}/><Rows rows={Object.values(quote.snapshot.schedules)} fields={['name', 'serviceHoursPerDay', 'nightHoursFraction', 'includesHolidays']}/><Rows rows={Object.values(quote.snapshot.products)} fields={['name', 'presentationSize', 'unit', 'publishedPrice', 'dosePerLiter', 'effectiveStock']}/></>}
        </Box></>}
    </Box>;
}
export const QuoteShow = (): ReactElement => <Show actions={false} component="div" emptyWhileLoading><QuoteDetail /></Show>;
