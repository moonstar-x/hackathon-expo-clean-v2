import { useState, type ReactElement, type ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress, FormHelperText, IconButton, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useDataProvider, useNotify, useShowContext } from 'react-admin';
import ZonePlan from './ZonePlan';
import useGeometry from '../../../hooks/useGeometry';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { useAppConfig } from '../../../AppConfigContext';
import { StateChip } from '../../../quotes/Chips';
import { number } from '../../../quotes/format';
import { editErrorText } from '../../../quotes/summaryDraft';
import { quoteFields, quoteText } from '../../../i18n/quotes';
import { EMPTY_SIMPLE_DRAFT, FREQUENCIES, MAX_MARGIN, MAX_WASTE_RATE, ZONE_COLORS } from '../../../constants/quotes';
import { simpleFigureSx, simpleParameterHeadSx, simpleValueSx, simpleParameterSx, simplePriceSx, simpleSummarySx, stepperSx, zoneSwatchSx, zoneToggleSx } from '../../../styles/quotes';
import { formatCurrency } from '../../../utils/format';
import { cleanedArea, cleaningTimes, floorArea, frequencyDays, frequencyOf } from '../../../utils/quotes';
import type { InventoryDataProvider } from '../../../types/providers';
import type { ScanGeometry } from '../../../types/geometry';
import type { CleaningFrequency, EngineResult, Quote, QuoteParameterValues, QuotePreview, SimpleDraft, SimpleSummaryProps, SummaryEdits, SummaryField, ZoneInput, ZonePatch, ZoneResult } from '../../../types/quotes';

/**
 * The order the edits are sent in: the API applies them one after another, and the minimum margin is
 * checked against the target margin, so the target goes first.
 */
const EDIT_ORDER: SummaryField[] = ['targetMargin', 'minimumMargin', 'targetWasteRate', 'peopleToHire'];
const ordered = (edits: SummaryEdits): SummaryEdits => Object.fromEntries(EDIT_ORDER.filter((field: SummaryField): boolean => field in edits).map((field: SummaryField): [SummaryField, number | null | undefined] => [field, edits[field]]));
const fraction = (value: number): number => Number(value.toFixed(4));
const wholePercent = (value: number): string => `${number(value * 100, 0)} %`;
const sum = (zones: ZoneInput[], of: (zone: ZoneInput) => number): number => zones.reduce((n: number, z: ZoneInput): number => n + of(z), 0);

function Parameter({ label, value, children, helperText, error }: { label: string; value?: ReactNode; children?: ReactNode; helperText?: string; error?: string }): ReactElement {
  return (
    <Box sx={simpleParameterSx}>
      <Box sx={simpleParameterHeadSx}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        {value !== undefined && <Box sx={simpleValueSx}>{value}</Box>}
      </Box>
      {children}
      {(error ?? helperText) && <FormHelperText error={!!error} sx={{ m: 0 }}>{error ?? helperText}</FormHelperText>}
    </Box>
  );
}

/** A count changed one at a time. */
function Stepper({ label, value, min, max = 1000, disabled, onChange }: { label: string; value: number; min: number; max?: number; disabled?: boolean; onChange: (value: number) => void }): ReactElement {
  return (
    <Box sx={stepperSx}>
      <IconButton size="small" aria-label={quoteText.decrease.replace('{label}', label.toLowerCase())} disabled={disabled || value <= min} onClick={(): void => onChange(value - 1)}><RemoveIcon fontSize="small" /></IconButton>
      <output aria-label={label}>{number(value, 0)}</output>
      <IconButton size="small" aria-label={quoteText.increase.replace('{label}', label.toLowerCase())} disabled={disabled || value >= max} onClick={(): void => onChange(value + 1)}><AddIcon fontSize="small" /></IconButton>
    </Box>
  );
}

/** The plan, or why there is none, with the floor of the zones shown under it. */
function PlanColumn({ quote, zones, colors, selected, onSelect }: { quote: Quote; zones: ZoneInput[]; colors: Record<number, string>; selected: number | null; onSelect: (position: number | null) => void }): ReactElement {
  const geometry: UseQueryResult<ScanGeometry, Error> = useGeometry(quote.measurementId ?? undefined);
  return (
    <Stack spacing={1.5}>
      {quote.measurementId === null
        ? <Alert severity="info">{quoteText.planNoMeasurement}</Alert>
        : geometry.isPending
          ? <CircularProgress aria-label={quoteText.planLoading} />
          : geometry.error
            ? <Alert severity="error">{quoteText.planError}</Alert>
            : <ZonePlan geometry={geometry.data} zones={zones} colors={colors} selected={selected} onSelect={onSelect} />}
      <Box>
        <Typography variant="h6" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>{quoteText.totalArea.replace('{area}', number(sum(zones, floorArea), 0))}</Typography>
        <Typography variant="body2" color="text.secondary">{quoteText.cleanableTotal.replace('{area}', number(sum(zones, cleanedArea), 0))}</Typography>
      </Box>
    </Stack>
  );
}

/**
 * The quote at a glance, for changing it in a few moves: the plan with each zone in its colour, and beside
 * it the parameters that move the price most, for the whole quote or one zone. Changes are previewed by the
 * API as they are made and saved to this quote with Recalcular.
 */
const SimpleSummary = ({ quote, draft, onDraftChange }: SimpleSummaryProps): ReactElement => {
  const theme: Theme = useTheme();
  const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const { refetch } = useShowContext<Quote>();
  const { currency }: { currency: string } = useAppConfig();
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const zonesChanged: boolean = Object.keys(draft.zones).length > 0;
  const edited: boolean = zonesChanged || Object.keys(draft.edits).length > 0;
  const zonePatches: ({ id?: number } & ZonePatch)[] = quote.zones.map((z: ZoneInput): { id?: number } & ZonePatch => ({ id: z.id, ...draft.zones[z.position] }));
  const request: string = JSON.stringify({ edits: ordered(draft.edits), zones: zonesChanged ? zonePatches : undefined });
  const settled: string = useDebouncedValue(request, 300);
  const preview: UseQueryResult<QuotePreview> = useQuery<QuotePreview>({
    queryKey: ['quotePreview', quote.id, quote.calculation.inputRevision, 'simple', settled],
    queryFn: (): Promise<QuotePreview> => { const { edits, zones } = JSON.parse(settled) as { edits: SummaryEdits; zones?: ({ id?: number } & ZonePatch)[] }; return provider.previewQuote(quote.id, edits, zones); },
    enabled: !!quote.result && edited,
    placeholderData: keepPreviousData,
  });
  const previewing: boolean = edited && !!preview.data;
  const result: EngineResult = previewing ? preview.data!.result : quote.result!;
  const errors: Partial<Record<SummaryField, string>> = Object.fromEntries(Object.entries(previewing ? preview.data!.errors : {}).filter(([field]: [string, unknown]): boolean => field in draft.edits).map(([field, error]: [string, keyof typeof editErrorText]): [string, string] => [field, editErrorText[error]]));
  const invalid: boolean = Object.keys(errors).length > 0 || preview.isError;
  const calculating: boolean = quote.calculation.state === 'pending' || quote.calculation.state === 'running';
  const disabled: boolean = calculating || saving;

  // The zones as they will be saved, coloured by their order in the quote.
  const zones: ZoneInput[] = quote.zones.map((z: ZoneInput): ZoneInput => ({ ...z, ...draft.zones[z.position] }));
  const palette: string[] = ZONE_COLORS[theme.palette.mode];
  const colors: Record<number, string> = Object.fromEntries(zones.flatMap((z: ZoneInput, i: number): [number, string][] => i < palette.length ? [[z.position, palette[i]]] : []));
  const zone: ZoneInput | undefined = zones.find((z: ZoneInput): boolean => z.position === selected);
  const targets: ZoneInput[] = zone ? [zone] : zones;

  const patchZones = (patch: (z: ZoneInput) => ZonePatch | null): void => onDraftChange((previous: SimpleDraft): SimpleDraft => {
    const next: Record<number, ZonePatch> = { ...previous.zones };
    for (const z of targets) {
      const change: ZonePatch | null = patch(z);
      if (change) next[z.position] = { ...next[z.position], ...change };
    }
    return { ...previous, zones: next };
  });
  const setEdit = (field: SummaryField, value: number | null): void => onDraftChange((previous: SimpleDraft): SimpleDraft => ({ ...previous, edits: { ...previous.edits, [field]: value } }));
  const editValue = (field: SummaryField, calculated: number): number => { const value: number | null | undefined = draft.edits[field]; return typeof value === 'number' ? value : calculated; };

  const totalFloor: number = sum(targets, floorArea);
  const cleanable: number = totalFloor > 0 ? sum(targets, cleanedArea) / totalFloor : 0;
  const parameters: QuoteParameterValues = result.parameters ?? quote.snapshot!.parameters;
  const wasteRate: number = editValue('targetWasteRate', parameters.targetWasteRate);
  const margins: [number, number] = [editValue('minimumMargin', result.pricing.minimumMargin), editValue('targetMargin', result.pricing.targetMargin)];
  const people: number = editValue('peopleToHire', result.staffing.peopleToHire);
  const frequencies: (CleaningFrequency | null)[] = targets.map((z: ZoneInput): CleaningFrequency | null => frequencyOf(z.daysPerMonth));
  const frequency: CleaningFrequency | null = frequencies.length > 0 && frequencies.every((f: CleaningFrequency | null): boolean => f === frequencies[0]) ? frequencies[0] : null;

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const data: { zones?: typeof zonePatches; edits?: SummaryEdits } = {};
      if (zonesChanged) data.zones = zonePatches;
      if (Object.keys(draft.edits).length > 0) data.edits = ordered(draft.edits);
      await provider.update<Quote>('quotes', { id: quote.id, data: data as Partial<Quote>, previousData: quote });
      onDraftChange(EMPTY_SIMPLE_DRAFT);
      await refetch();
    } catch {
      notify(quoteText.priceApplyError, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {edited && <Alert severity={preview.isError ? 'error' : 'info'} sx={{ mb: 3 }} icon={preview.isFetching ? <CircularProgress size={18} /> : undefined}
        action={<Stack direction="row" spacing={1}><Button color="inherit" size="small" disabled={saving} onClick={(): void => onDraftChange(EMPTY_SIMPLE_DRAFT)}>{quoteText.discard}</Button><Button variant="contained" size="small" disabled={invalid || disabled} onClick={save}>{quoteText.recalculate}</Button></Stack>}>
        {preview.isError ? quoteText.previewError : quoteText.simpleDraftAdvice}
      </Alert>}
      <Box sx={simpleSummarySx}>
        <PlanColumn quote={quote} zones={zones} colors={colors} selected={selected} onSelect={setSelected} />
        <Stack spacing={2.5}>
          <ToggleButtonGroup exclusive size="small" aria-label={quoteText.zoneChoice} value={selected ?? 'total'} onChange={(_event: unknown, value: number | 'total' | null): void => { if (value !== null) setSelected(value === 'total' ? null : value); }} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <ToggleButton value="total" sx={zoneToggleSx(theme.palette.primary.main)}>{quoteText.grandTotal}</ToggleButton>
            {zones.map((z: ZoneInput): ReactElement => (
              <ToggleButton key={z.position} value={z.position} sx={zoneToggleSx(colors[z.position] ?? theme.palette.text.secondary)}>
                <Box component="span" aria-hidden sx={zoneSwatchSx(colors[z.position] ?? theme.palette.text.disabled)} />{z.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="h6">{quoteText.parameters}</Typography>
          <Parameter label={quoteText.cleanableArea} value={wholePercent(cleanable)} helperText={zone ? undefined : quoteText.allZones}>
            <Slider value={Math.round(cleanable * 100)} min={0} max={100} step={1} disabled={disabled || totalFloor === 0} valueLabelDisplay="auto" valueLabelFormat={(v: number): string => `${v} %`}
              onChange={(_event: Event, value: number | number[]): void => { const share: number = (Array.isArray(value) ? value[0] : value) / 100; patchZones((z: ZoneInput): ZonePatch | null => floorArea(z) > 0 ? { cleanedArea: Number((share * floorArea(z)).toFixed(2)) } : null); }}
              slotProps={{ input: { 'aria-label': quoteText.cleanableArea } }} />
          </Parameter>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{quoteText.labor}</Typography>
            <Stack spacing={1} sx={{ pl: 2 }}>
              <Parameter label={quoteFields.machines} helperText={zone ? undefined : quoteText.machinesPerZone}
                value={zone ? <Stepper label={quoteFields.machines} value={zone.machines ?? 0} min={0} disabled={disabled} onChange={(value: number): void => patchZones((): ZonePatch => ({ machines: value }))} /> : number(sum(zones, (z: ZoneInput): number => z.machines ?? 0), 0)} />
              <Parameter label={quoteText.staffing} helperText={zone ? quoteText.wholeQuote : undefined} error={errors.peopleToHire}
                value={<Stepper label={quoteText.staffing} value={people} min={1} disabled={disabled} onChange={(value: number): void => setEdit('peopleToHire', value)} />} />
            </Stack>
          </Box>
          <Parameter label={quoteText.waste} value={wholePercent(wasteRate)} error={errors.targetWasteRate}>
            <Slider value={Math.round(wasteRate * 100)} min={0} max={Math.max(MAX_WASTE_RATE, wasteRate) * 100} step={1} disabled={disabled} valueLabelDisplay="auto" valueLabelFormat={(v: number): string => `${v} %`}
              onChange={(_event: Event, value: number | number[]): void => setEdit('targetWasteRate', fraction((Array.isArray(value) ? value[0] : value) / 100))}
              slotProps={{ input: { 'aria-label': quoteFields.targetWasteRate } }} />
          </Parameter>
          <Parameter label={quoteText.marginRange} value={`${quoteText.marginMinimum} ${wholePercent(margins[0])} · ${quoteText.marginTarget} ${wholePercent(margins[1])}`} error={errors.targetMargin ?? errors.minimumMargin}>
            <Slider value={margins.map((m: number): number => Math.round(m * 100))} min={0} max={Math.max(MAX_MARGIN, margins[1]) * 100} step={1} disableSwap disabled={disabled} valueLabelDisplay="auto" valueLabelFormat={(v: number): string => `${v} %`}
              getAriaLabel={(thumb: number): string => thumb === 0 ? quoteText.marginMinimumLabel : quoteText.marginTargetLabel}
              onChange={(_event: Event, value: number | number[], thumb: number): void => { const values: number[] = Array.isArray(value) ? value : [value]; setEdit(thumb === 0 ? 'minimumMargin' : 'targetMargin', fraction(values[thumb] / 100)); }} />
          </Parameter>
          <Parameter label={quoteText.frequency} helperText={zone ? undefined : quoteText.allZones}>
            <ToggleButtonGroup exclusive size="small" color="primary" aria-label={quoteText.frequency} value={frequency} disabled={disabled}
              onChange={(_event: unknown, value: CleaningFrequency | null): void => { if (value) patchZones((z: ZoneInput): ZonePatch | null => frequencyOf(z.daysPerMonth) === value ? null : { daysPerMonth: frequencyDays(value, parameters.defaultDaysPerMonth) }); }}>
              {FREQUENCIES.map((f: CleaningFrequency): ReactElement => <ToggleButton key={f} value={f} sx={{ px: 2, textTransform: 'none' }}>{quoteText[f]}</ToggleButton>)}
            </ToggleButtonGroup>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 1, p: 0, listStyle: 'none' }}>
              {zones.map((z: ZoneInput, i: number): ReactElement | null => {
                const r: ZoneResult | undefined = result.zones[i];
                const f: CleaningFrequency | null = frequencyOf(z.daysPerMonth);
                if (!r?.active || !f) return null;
                return (
                  <Box component="li" key={z.position} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: zone && zone.position !== z.position ? 0.5 : 1 }}>
                    <Box component="span" aria-hidden sx={zoneSwatchSx(colors[z.position] ?? theme.palette.text.disabled)} />
                    <Typography variant="body2"><strong>{z.name}:</strong> {quoteText[f].toLowerCase()}, {cleaningTimes(f, r.cleaningsPerDay, r.cleaningsPerMonth)}</Typography>
                  </Box>
                );
              })}
            </Stack>
          </Parameter>
          <Box sx={simplePriceSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography variant="h6" component="p">{quoteText.totalPrice}:</Typography>
              <Typography variant="h5" component="p" sx={simpleFigureSx}>{formatCurrency(result.pricing.offeredPrice, currency)}</Typography>
              <StateChip value={result.pricing.marginStatus} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{quoteText.priceWithVat.replace('{total}', formatCurrency(result.pricing.totalWithVat, currency))}</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default SimpleSummary;
