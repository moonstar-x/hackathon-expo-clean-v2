import { useEffect, useState, type Dispatch, type ReactElement, type ReactNode, type ChangeEvent, type SetStateAction, type SyntheticEvent } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Link, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { DeleteButton, EditButton, Show, useDataProvider, useNotify, useRecordContext, useRedirect, useShowContext, useTranslate, type TranslateFunction } from 'react-admin';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import KeyFigures from '../components/KeyFigures';
import ResponsiveSwitch from '../components/ResponsiveSwitch';
import OutlinedBadge from '../components/list/OutlinedBadge';
import ShowSection from '../components/show/ShowSection';
import DocumentButton from '../components/quotes/List/DocumentButton';
import TechnicalOffer from '../components/quotes/show/TechnicalOffer';
import PriceInput from '../components/quotes/show/PriceInput';
import QuotePlan from '../components/quotes/show/QuotePlan';
import SimpleSummary from '../components/quotes/show/SimpleSummary';
import useGeometry from '../hooks/useGeometry';
import type { ScanGeometry } from '../types/geometry';
import { detailPageSx } from '../styles/pages';
import { quoteMetaSx, quoteTabPanelSx, emptyFiguresSx, quoteTableSx, quoteTabsCardSx, quoteTabsSx, valuesGridSx, valuesRibbonSx, wastePeriodSx, zoneInputsTableSx } from '../styles/quotes';
import ConfirmButton from '../components/ConfirmButton';
import { useAppConfig } from '../AppConfigContext';
import { quoteEnums, quoteFields, quoteIssues, quoteText } from '../i18n/quotes';
import type { InventoryDataProvider } from '../types/providers';
import type { EngineResult, Issue, ParameterSection, ParameterTab, PurchasePlanRow, Quote, QuoteParameterValues, QuotePreview, SimpleDraft, SummaryDraft, SummaryEdits, SummaryField, TechnicalProduct, WasteControl, WasteRow, ZoneInput, ZoneResult, ZoneTypeValues } from '../types/quotes';
import { formatCurrency } from '../utils/format';
import { formatDateTime, formatPeriod, recentPeriods } from '../utils/dates';
import { EMPTY_SIMPLE_DRAFT, WASTE_PERIODS } from '../constants/quotes';
import { QuoteStatus, StateChip } from './Chips';
import { PARAMETER_TABS } from '../constants/quoteSettings';
import { parameterFields } from './parameterFields';
import { number, percent, previewWaste } from './format';
import { draftEdits, editDraft, editErrorText, PERCENT_FIELDS, SIGNED_FIELDS, SUMMARY_FIELDS } from './summaryDraft';
import useDebouncedValue from '../hooks/useDebouncedValue';
const tabs: string[] = [quoteText.summary, quoteText.detailed, quoteText.zones, quoteText.plan, quoteText.technicalOffer, quoteText.purchasePlan, quoteText.flatRate, quoteText.wasteControl, quoteText.assumptions];
const moneyFields: Set<string> = new Set(['laborHourlyRate','machineLaborHourlyRate','supervision','equipment','transport','insurance','operatingCost','administration','contingency','indirectToAllocate','monthlyWage','basicWage','supervisorMonthlyCost','baseEppPerFte','criticalEppPerFte','mopCost','equipmentMonthly','transportMonthly','insuranceMonthly','flatRatePerM2','paperSoapMonthly','defaultPaperSoapPerFixtureMonthly','offeredPrice', 'totalCost', 'profit', 'vat', 'totalWithVat', 'annualProfit', 'pricePerM2', 'targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom', 'laborCost', 'chemicalsTheoretical', 'chemicalsWaste', 'chemicalsWithWaste', 'eppAndHygiene', 'utensils', 'directCost', 'allocatedIndirect', 'costPerM2', 'purchaseCost', 'wasteCost', 'excessCost', 'withWaste', 'uncontrolledWasteCost', 'controlledWasteCost', 'monthlyWasteSavings', 'annualWasteSavings', 'revenue', 'price', 'difference', 'pricePerContainer', 'pricePerUnit']);
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
function Values({ values, title, children, ribbon, editors }: {
    values: object;
    title?: string;
    /** Inputs shown in place of some values, by field, to change them here. */
    editors?: Partial<Record<string, ReactNode>>;
    /** Shown between the title and the values, such as the input the values depend on. */
    children?: ReactNode;
    /** A note on the whole card, as a band along its foot. */
    ribbon?: ReactNode;
}): ReactElement {
    return <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
    {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
    {children}
    <Box component="dl" sx={valuesGridSx}>{Object.entries(values).filter(([key]: [
        string,
        unknown
    ]): boolean => !!quoteFields[key]).map(([key, value]: [
        string,
        unknown
    ]): ReactElement => <Box key={key} sx={{ display: 'contents' }}>
    <Typography component="dt" variant="body2" color="text.secondary">{quoteFields[key]}</Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{editors?.[key] ?? <DisplayValue field={key} value={value}/>}</Typography>
    </Box>)}</Box>
    </CardContent>{ribbon && <Box sx={valuesRibbonSx}><InfoOutlinedIcon/>{ribbon}</Box>}</Card>;
}
/** A table from md up; below it, one card per row, titled by its first field (its name). */
function Rows({ rows, fields }: {
    rows: object[];
    fields: string[];
}): ReactElement {
    const [first, ...rest]: string[] = fields;
    return <ResponsiveSwitch
    mobile={<>{rows.map((row: object, i: number): ReactElement => <Values key={i} title={((row as Record<string, unknown>)[first] ?? '—') as string} values={subset(row, rest)}/>)}</>}
    desktop={<TableContainer sx={quoteTableSx}><Table size="small">
    <TableHead><TableRow>{fields.map((k: string): ReactElement => <TableCell key={k}>{quoteFields[k] ?? quoteFields.status}</TableCell>)}</TableRow></TableHead>
    <TableBody>
    {rows.map((row: object, i: number): ReactElement => <TableRow key={i}>{fields.map((k: string): ReactElement => <TableCell key={k}><DisplayValue field={k} value={(row as Record<string, unknown>)[k]}/></TableCell>)}</TableRow>)}
    </TableBody>
    </Table></TableContainer>}/>;
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
    <TextField select label={quoteText.wasteMonth} value={period} onChange={(e: ChangeEvent<HTMLInputElement>): void => setPeriod(e.target.value)} sx={wastePeriodSx}>{recentPeriods(WASTE_PERIODS).map((month: string): ReactElement => <MenuItem key={month} value={month}>{formatPeriod(month)}</MenuItem>)}</TextField>
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
    const preview: WasteControl = previewWaste(quote.result!.purchasePlan.rows, (quote.result!.parameters ?? quote.snapshot!.parameters).targetWasteRate, actuals, data.period);
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
    // In a card the product's name is already the title above the input: only screen readers hear it again.
    const input = (row: WasteRow, inCard: boolean = false): ReactElement => <TextField size="small" type="number" fullWidth={inCard} sx={inCard ? { mb: 2 } : undefined} label={inCard ? `${quoteText.realConsumptionShort} (${row.unit})` : `${quoteText.realConsumption} ${row.name} (${row.unit})`} value={actuals[row.productId] ?? ''} slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-label': `${quoteText.realConsumption} ${row.name} (${row.unit})` } }} onChange={(event: ChangeEvent<HTMLInputElement>): void => { const raw: string = event.target.value; setActuals((previous: Record<number, number | null>): Record<number, number | null> => ({ ...previous, [row.productId]: raw === '' ? null : Number(raw) })); }}/>;
    return <><ResponsiveSwitch
    mobile={<>{preview.rows.map((row: WasteRow): ReactElement => <Values key={row.productId} title={row.name} values={{ theoretical: `${number(row.theoretical, 3)} ${row.unit}`, realWasteRate: row.realWasteRate, excess: row.excess, excessCost: row.excessCost, status: row.status }}>{input(row, true)}</Values>)}</>}
    desktop={<TableContainer><Table size="small">
    <TableHead><TableRow>{['name', 'theoretical', 'actual', 'realWasteRate', 'excess', 'excessCost', 'status'].map((key: string): ReactElement => <TableCell key={key}>{quoteFields[key]}</TableCell>)}</TableRow></TableHead>
    <TableBody>{preview.rows.map((row: WasteRow): ReactElement => <TableRow key={row.productId}>
    <TableCell>{row.name}</TableCell>
    <TableCell>{number(row.theoretical, 3)} {row.unit}</TableCell>
    <TableCell>{input(row)}</TableCell>
    <TableCell>{percent(row.realWasteRate)}</TableCell>
    <TableCell>{number(row.excess, 3)}</TableCell>
    <TableCell><DisplayValue field="excessCost" value={row.excessCost}/></TableCell>
    <TableCell><StateChip value={row.status}/></TableCell>
    </TableRow>)}</TableBody>
    </Table></TableContainer>}/><Typography sx={{ my: 2 }}>{quoteText.excessTotal} <DisplayValue field="excessCost" value={preview.totalExcessCost}/></Typography><Button variant="contained" disabled={saving} onClick={save}>{quoteText.save}</Button></>;
}
const zoneGroups: [
    string,
    string[]
][] = [[quoteText.areas, ['floorArea', 'cleanedArea', 'machines', 'floorRateM2PerHour', 'cleaningDuration']], [quoteText.frequency, ['hoursBetweenCleanings', 'cleaningsPerDay', 'cleaningsPerMonth', 'terminalsPerMonth']], [quoteText.hours, ['dailyCleaningHours', 'terminalHours', 'taskHours', 'presenceHours', 'billableHours']], [quoteText.payrollGroup, ['nightFraction', 'holidayFraction', 'laborCost', 'fte', 'm2PerPersonInService']], [quoteFields.chemicals, ['dailySolutionLiters', 'terminalSolutionLiters', 'cleaningConcentrate', 'dailyDisinfectantConcentrate', 'terminalDisinfectantConcentrate', 'chemicalsTheoretical', 'chemicalsWithWaste']], [quoteText.costs, ['eppAndHygiene', 'utensils', 'directCost', 'allocatedIndirect', 'totalCost', 'targetPrice', 'costPerM2', 'pricePerM2']]];
const subset = (value: object, keys: string[]): Record<string, unknown> => Object.fromEntries(keys.map((k: string): [
    string,
    unknown
] => [k, (value as Record<string, unknown>)[k]]));
function ZoneDetails({ quote, openZone }: {
    quote: Quote;
    /** The position of a zone to show open and scroll to ("Ir a la zona"). */
    openZone?: number;
}): ReactElement {
    const redirect: ReturnType<typeof useRedirect> = useRedirect();
    return <>{quote.zones.map((z: ZoneInput, i: number): ReactElement => { const result: ZoneResult = quote.result!.zones[i]; return <Accordion key={z.id} id={`zone-${z.position}`} defaultExpanded={openZone === z.position}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>
    {z.name}
    {!result.active && <OutlinedBadge label={quoteText.inactive} tone="orange" dense/>}
    </Typography></AccordionSummary>
    <AccordionDetails>
    {result.causes.map((cause: Issue): ReactElement => <Alert key={cause.code} severity="warning">{issueMessage(cause)}</Alert>)}
    <Button onClick={(): void => redirect(`/quotes/${quote.id}/zones`)}>{quoteText.editZone}</Button>
    <Typography variant="h6">{quoteText.inputsSources}</Typography>
    <TableContainer sx={zoneInputsTableSx}><Table size="small"><TableBody>{Object.entries(z).filter(([key]: [
        string,
        unknown
    ]): boolean => !!quoteFields[key] && !['id', 'position'].includes(key)).map(([key, v]: [
        string,
        unknown
    ]): ReactElement => <TableRow key={key}>
    <TableCell>{quoteFields[key]}</TableCell>
    <TableCell><DisplayValue field={key} value={key === 'zoneTypeId' ? quote.snapshot!.zoneTypes[Number(v)]?.name ?? null : key === 'scheduleId' ? quote.snapshot!.schedules[Number(v)]?.name ?? null : v}/></TableCell>
    <TableCell>{z.sources[key] && <OutlinedBadge label={quoteEnums[z.sources[key]]} dense/>}</TableCell>
    </TableRow>)}</TableBody></Table></TableContainer>
    {zoneGroups.map(([title, keys]: [
        string,
        string[]
    ]): ReactElement => <Values key={title} title={title} values={subset(result, keys)}/>)}
    </AccordionDetails>
    </Accordion>; })}</>;
}
/** The measurement's plan with each room's monthly cost; choosing a room opens its zone. */
function QuotePlanPanel({ quote, onSelect }: {
    quote: Quote;
    onSelect: (position: number) => void;
}): ReactElement {
    const geometry: UseQueryResult<ScanGeometry, Error> = useGeometry(quote.measurementId ?? undefined);
    if (quote.measurementId === null)
        return <Alert severity="info">{quoteText.planNoMeasurement}</Alert>;
    if (geometry.isPending)
        return <CircularProgress aria-label={quoteText.planLoading}/>;
    if (geometry.error)
        return <Alert severity="error">{quoteText.planError}</Alert>;
    return <QuotePlan geometry={geometry.data} zones={quote.zones} results={quote.result!.zones} onSelect={onSelect}/>;
}
export function QuoteDetail(): ReactElement | null {
    const quote: Quote | undefined = useRecordContext<Quote>();
    const { refetch } = useShowContext<Quote>();
    const [tab, setTab]: [
        number,
        (v: number) => void
    ] = useState<number>(0);
    const [draft, setDraft]: [
        SummaryDraft,
        Dispatch<SetStateAction<SummaryDraft>>
    ] = useState<SummaryDraft>({});
    // The Resumen tab's changes live here, so they outlast a look at another tab.
    const [simpleDraft, setSimpleDraft]: [
        SimpleDraft,
        Dispatch<SetStateAction<SimpleDraft>>
    ] = useState<SimpleDraft>(EMPTY_SIMPLE_DRAFT);
    const [openZone, setOpenZone]: [
        number | undefined,
        (v: number | undefined) => void
    ] = useState<number | undefined>(undefined);
    const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
    const notify: ReturnType<typeof useNotify> = useNotify();
    const translate: TranslateFunction = useTranslate();
    const { currency }: {
        currency: string;
    } = useAppConfig();
    // Values changed in place go to the API once typing pauses: it works out everything they change, and
    // Recalcular saves them on this quote only. The inputs it can't send yet show why instead.
    const { edits, errors: inputErrors } = draftEdits(draft);
    const edited: boolean = Object.keys(draft).length > 0;
    const settledEdits: string = useDebouncedValue(JSON.stringify(edits), 300);
    const preview: UseQueryResult<QuotePreview> = useQuery<QuotePreview>({ queryKey: ['quotePreview', quote?.id, quote?.calculation.inputRevision, settledEdits], queryFn: (): Promise<QuotePreview> => provider.previewQuote(quote!.id, JSON.parse(settledEdits) as SummaryEdits), enabled: !!quote?.result && edited && settledEdits !== '{}', placeholderData: keepPreviousData });
    if (!quote)
        return null;
    const goToZone = (position: number): void => {
        setOpenZone(position);
        setTab(2);
        requestAnimationFrame((): void => { document.getElementById(`zone-${position}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    };
    const result: Quote['result'] = quote.result;
    // While a draft is open, the whole tab and its untouched inputs show what it will give.
    const previewing: boolean = edited && !!preview.data;
    const shown: EngineResult | null = previewing ? preview.data!.result : result;
    const draftErrors: Partial<Record<SummaryField, string>> = { ...Object.fromEntries(Object.entries(previewing ? preview.data!.errors : {}).filter(([field]: [string, unknown]): boolean => field in draft).map(([field, error]: [string, keyof typeof editErrorText]): [string, string] => [field, editErrorText[error]])), ...inputErrors };
    const invalid: boolean = Object.keys(draftErrors).length > 0;
    const calculating: boolean = quote.calculation.state === 'pending' || quote.calculation.state === 'running';
    const customized: boolean = Object.keys(quote.overrides ?? {}).length > 0 || quote.manualPrice !== null || quote.targetMargin !== null;
    const save = async (data: Partial<Quote> | { edits: SummaryEdits }): Promise<void> => {
        await provider.update<Quote>('quotes', { id: quote.id, data: data as Partial<Quote>, previousData: quote });
        setDraft({});
    };
    const recalculate = async (): Promise<void> => { try {
        if (edited && result)
            await save({ edits });
        else
            await provider.quoteAction(quote.id, 'recalculate');
        await refetch();
    }
    catch {
        notify(edited ? quoteText.priceApplyError : quoteText.recalculateError, { type: 'error' });
    } };
    const figure = (value: number): string => String(Number(value.toFixed(2)));
    const change = (field: SummaryField, value: string): void => setDraft((previous: SummaryDraft): SummaryDraft => editDraft(previous, field, value));
    /** An input in place of a value; `placeholder` is what a cleared one falls back to. Percentages are given as fractions. */
    const editor = (field: SummaryField, current: number | undefined, { placeholder, helperText }: { placeholder?: number; helperText?: string } = {}): ReactElement => {
        const typed: string | undefined = draft[field];
        const show = (value: number): string => figure(PERCENT_FIELDS.has(field) ? value * 100 : value);
        return <PriceInput field={field} percent={PERCENT_FIELDS.has(field)} signed={SIGNED_FIELDS.has(field)} value={typeof typed === 'string' ? typed : current === undefined ? '' : show(current)} placeholder={placeholder === undefined ? undefined : show(placeholder)} onChange={(value: string): void => change(field, value)} error={draftErrors[field]} helperText={helperText} disabled={calculating}/>;
    };
    /** An input for each of a card's editable values; `custom` replaces some of them. */
    const editors = (values: object, custom: Partial<Record<SummaryField, ReactNode>> = {}): Partial<Record<string, ReactNode>> => ({ ...Object.fromEntries(Object.entries(values).filter(([key, value]: [string, unknown]): boolean => SUMMARY_FIELDS.has(key) && typeof value === 'number').map(([key, value]: [string, number]): [string, ReactNode] => [key, editor(key as SummaryField, value)])), ...custom });
    // A cleared input shows what it falls back to: the target price, or the margin (and its price) in Parámetros.
    const globalMargin: number | undefined = quote.snapshot?.parameters.targetMargin;
    const pricing: EngineResult['pricing'] | undefined = shown?.pricing;
    const totalCost: number = shown?.costs.totalCost ?? 0;
    const staffing: EngineResult['staffing'] | undefined = shown?.staffing;
    const calculatedParameters: QuoteParameterValues | undefined = shown?.parameters;
    return <Box>
    <PageHeader eyebrow={quoteText.quotes} title={quote.name} badge={<QuoteStatus quote={quote}/>} actions={<><DocumentButton variant="outlined"/><Button variant="contained" disabled={edited && invalid} onClick={recalculate}>{quoteText.recalculate}</Button><EditButton variant="outlined"/><ConfirmButton label={quoteText.regenerate} variant="outlined" disabled={quote.measurementId === null} confirmContent={quoteText.regenerateConfirm} onConfirm={async (): Promise<void> => { await provider.quoteAction(quote.id, 'regenerate'); await refetch(); }}><AutorenewIcon/></ConfirmButton><DeleteButton mutationMode="pessimistic"/></>}/>
    <Grid container spacing={2} sx={detailPageSx}>
    <Grid size={12}><ShowSection title={translate('app.quotes.glance')}>
    <KeyFigures items={[
        { label: quoteFields.offeredPrice, value: formatCurrency(quote.summary.offeredPrice, currency) },
        { label: quoteFields.margin, value: <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}><span>{percent(quote.summary.margin)}</span>{quote.summary.marginStatus && <StateChip value={quote.summary.marginStatus}/>}</Stack> },
        { label: quoteFields.totalCost, value: formatCurrency(quote.summary.totalCost, currency) },
        { label: quoteFields.fte, value: number(quote.summary.fte) },
        { label: quoteFields.totalFloorArea, value: number(quote.summary.totalFloorArea) },
    ]}/>
    <Box sx={quoteMetaSx}>
    {quote.measurementId !== null && <Link component={RouterLink} to={`/measurements/${quote.measurementId}/show`} variant="body2">{quoteText.measurement} {quote.measurementId}</Link>}
    <Typography variant="body2" color="text.secondary">{quoteText.calculatedOn} {quote.calculation.calculatedAt ? formatDateTime(quote.calculation.calculatedAt) : '—'}</Typography>
    </Box>
    </ShowSection></Grid>
    <Grid size={12}><Stack spacing={1.5}>
    <CalculationProgress key={quote.calculation.inputRevision} state={quote.calculation.state} refetch={refetch}/>
    {quote.calculation.state === 'failed' && <Alert severity="error">{quoteText.calculationError} {quote.calculation.error} <Button onClick={recalculate}>{quoteText.recalculate}</Button></Alert>}
    {quote.calculation.isStale && <Alert severity="warning">{quoteText.staleBanner} <Button onClick={recalculate}>{quoteText.recalculate}</Button></Alert>}
    {quote.status === 'needsReview' && <Alert severity="warning">
    <Typography fontWeight={600}>{quoteText.preliminary}</Typography>
    {result?.causes.map((cause: Issue, i: number): ReactElement => <Typography component="div" key={i}>
    {issueMessage(cause)}
    {cause.zoneIndex !== undefined && <Button size="small" onClick={(): void => goToZone(cause.zoneIndex!)}>{quoteText.goToZone}</Button>}
    </Typography>)}
    </Alert>}
    {result?.warnings.map((warning: Issue, i: number): ReactElement => <Alert key={i} severity="warning">{issueMessage(warning)}</Alert>)}
    </Stack></Grid>
        {result && <Grid size={12}><Card sx={quoteTabsCardSx}><Tabs value={tab} onChange={(_event: SyntheticEvent, value: number): void => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={quoteTabsSx}>{tabs.map((title: string): ReactElement => <Tab key={title} label={title}/>)}</Tabs><Box role="tabpanel" aria-label={tabs[tab]} sx={quoteTabPanelSx}>
        {tab === 0 && <SimpleSummary quote={quote} draft={simpleDraft} onDraftChange={setSimpleDraft}/>}
        {tab === 1 && shown && pricing && staffing && <>{edited && <Alert severity={preview.isError ? 'error' : 'info'} sx={{ mb: 2 }} icon={preview.isFetching ? <CircularProgress size={18}/> : undefined} action={<Stack direction="row" spacing={1}><Button color="inherit" size="small" onClick={(): void => setDraft({})}>{quoteText.discard}</Button><Button variant="contained" size="small" disabled={invalid || calculating} onClick={recalculate}>{quoteText.recalculate}</Button></Stack>}>{preview.isError ? quoteText.previewError : quoteText.priceDraftAdvice}</Alert>}
        {!edited && customized && <Alert severity="info" sx={{ mb: 2 }} action={<ConfirmButton label={quoteText.resetValues} color="inherit" size="small" disabled={calculating} confirmContent={quoteText.resetValuesConfirm} onConfirm={async (): Promise<void> => { await save({ overrides: {}, manualPrice: null, targetMargin: null }); await refetch(); }}/>}>{quoteText.customValues}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Box>
        <Values title={`${quoteText.monthlyResult}${pricing.isManualPrice ? ` ${quoteText.manualPriceSuffix}` : ''}`} values={subset(pricing, ['offeredPrice', 'vat', 'totalWithVat', 'profit', 'margin', 'marginStatus', 'annualProfit', 'pricePerM2'])} editors={editors(pricing, { offeredPrice: editor('offeredPrice', pricing.offeredPrice, { placeholder: pricing.targetPrice }) })}/>
        <Values title={quoteFields.totalCost} values={shown.costs} editors={editors(shown.costs)}/>
        </Box>
        <Box>
        <Values title={`${quoteText.negotiation}${pricing.isCustomMargin ? ` ${quoteText.customMarginSuffix}` : ''}`} values={subset(pricing, ['targetMargin', 'targetPrice', 'minimumPrice', 'breakEvenPrice', 'negotiationRoom'])} editors={editors(pricing, { targetMargin: editor('targetMargin', pricing.targetMargin, { placeholder: globalMargin, helperText: globalMargin === undefined ? undefined : quoteText.globalMargin.replace('{margin}', percent(globalMargin)) }), targetPrice: editor('targetPrice', pricing.targetPrice, { placeholder: globalMargin === undefined || globalMargin >= 1 ? undefined : totalCost / (1 - globalMargin) }) })} ribbon={quoteText.minimumAdvice}/>
        <Values title={quoteText.staffing} values={subset(staffing, ['peopleToHire', 'laborHourlyRate', 'personHours', 'fte', 'supervisors'])} editors={editors(staffing, {
            peopleToHire: editor('peopleToHire', staffing.peopleToHire, { helperText: staffing.isCustomWorkers ? undefined : quoteText.workersAdvice }),
            laborHourlyRate: editor('laborHourlyRate', staffing.laborHourlyRate, { helperText: calculatedParameters && calculatedParameters.laborHourlyRate == null ? quoteText.laborRateFromWage : undefined }),
        })} ribbon={quoteText.shiftAdvice}/>
        <Values title={quoteText.chemicalsGroup} values={shown.chemicals} editors={editors(shown.chemicals)} ribbon={quoteText.wasteHypothetical}/>
        </Box>
        </Box><Typography variant="h6">{quoteText.dollarBreakdown}</Typography><Rows fields={['name', 'totalCost', 'share']} rows={shown.breakdown.map((r: {
            key: string;
            amount: number;
            share: number | null;
        }): object => ({ name: quoteFields[r.key], totalCost: r.amount, share: r.share }))}/><Typography variant="h6">{quoteText.zoneBreakdown}</Typography><Rows fields={['name', 'zoneTypeName', 'risk', 'floorArea', 'cleanedArea', 'machines', 'fte', 'totalCost', 'targetPrice', 'pricePerM2']} rows={[...shown.zones.map((z: ZoneResult, i: number): object => ({ ...z, zoneTypeName: quote.snapshot!.zoneTypes[quote.zones[i].zoneTypeId!]?.name })), { name: quoteText.grandTotal, ...shown.totals }]}/></>}
        {tab === 2 && <ZoneDetails quote={quote} openZone={openZone}/>}
        {tab === 3 && <QuotePlanPanel quote={quote} onSelect={goToZone}/>}
        {tab === 4 && <TechnicalOffer rows={result.technicalOffer} totalFte={result.totals.fte}/>}
        {tab === 5 && <><Rows fields={['name', 'unit', 'presentationSize', 'pricePerContainer', 'pricePerUnit', 'theoretical', 'waste', 'total', 'containers', 'stock', 'toBuy', 'purchaseCost', 'wasteCost']} rows={result.purchasePlan.rows.map((r: PurchasePlanRow): object => ({ ...r, stock: quote.snapshot!.products[r.productId]?.inventoryProductId ? `${number(r.stock, 0)} · ${quoteText.inventorySource}` : r.stock }))}/><Values title={quoteText.totals} values={{ purchaseCost: result.purchasePlan.totalPurchaseCost, wasteCost: result.purchasePlan.totalWasteCost }}/></>}
        {tab === 6 && <>{result.flatRate.rate > 0
            ? <><Values title={quoteText.flatRate} values={result.flatRate}/><Rows fields={['name', 'floorArea', 'totalCost', 'flatRateRevenue', 'flatRateMargin', 'status']} rows={result.zones.map((z: ZoneResult): object => ({ ...z, status: z.flatRateStatus }))}/></>
            : <Values title={quoteText.flatRate} values={{}}><Typography fontWeight={500}>{quoteText.noFlatRate}</Typography><Typography variant="body2" sx={emptyFiguresSx}>{translate('app.quotes.flatRateHint')}</Typography><Button size="small" variant="outlined" component={RouterLink} to="/quote-parameters/1">{translate('app.quotes.configureFlatRate')}</Button></Values>}
        {result.reference.price
            ? <Values title={quoteFields.externalReferencePrice} values={result.reference}/>
            : <Values title={quoteFields.externalReferencePrice} values={{}}><Typography fontWeight={500}>{translate('app.quotes.noReference')}</Typography><Typography variant="body2" sx={emptyFiguresSx}>{quoteText.referencePrompt}</Typography><Button size="small" variant="outlined" component={RouterLink} to={`/quotes/${quote.id}`}>{translate('ra.action.edit')}</Button></Values>}</>}
        {tab === 7 && <WasteEditor quote={quote}/>}
        {tab === 8 && quote.snapshot && <><Typography variant="h6">{quoteText.snapshot}</Typography>{Object.values(quote.snapshot.zoneTypes).map((type: ZoneTypeValues): ReactElement => <Values key={type.id} title={type.name} values={{ ...type,cleaningProductId:quote.snapshot!.products[type.cleaningProductId]?.name,dailyDisinfectantId:quote.snapshot!.products[type.dailyDisinfectantId]?.name,terminalDisinfectantId:quote.snapshot!.products[type.terminalDisinfectantId]?.name,hoursBetweenLow:type.hoursBetweenCleanings.low,hoursBetweenMedium:type.hoursBetweenCleanings.medium,hoursBetweenHigh:type.hoursBetweenCleanings.high }} />)}{PARAMETER_TABS.map((group: ParameterTab): ReactElement => <Values key={group.title} title={group.title} values={subset(quote.result!.parameters ?? quote.snapshot!.parameters, group.sections.flatMap((section: ParameterSection): string[] => section.fields.map((f: typeof parameterFields[number]): string => f.name)))} />)}<Rows rows={Object.values(quote.snapshot.zoneTypes)} fields={['name', 'risk', 'dailyRateM2PerHour', 'terminalRateM2PerHour', 'solutionLitersPerM2']}/><Rows rows={Object.values(quote.snapshot.schedules)} fields={['name', 'serviceHoursPerDay', 'nightHoursFraction', 'includesHolidays']}/><Rows rows={Object.values(quote.snapshot.products)} fields={['name', 'presentationSize', 'unit', 'publishedPrice', 'dosePerLiter', 'effectiveStock']}/></>}
        </Box></Card></Grid>}
    </Grid>
    </Box>;
}
export const QuoteShow = (): ReactElement => <Show actions={false} component="div" emptyWhileLoading><QuoteDetail /></Show>;
