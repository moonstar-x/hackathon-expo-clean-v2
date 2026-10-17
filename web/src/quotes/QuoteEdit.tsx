import { createContext, useContext, type Context, type ReactElement, type ReactNode } from 'react';
import { Alert, Grid, Typography } from '@mui/material';
import RemoveDoneIcon from '@mui/icons-material/RemoveDone';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { ArrayInput, BooleanInput, DateInput, Edit, NumberInput, ReferenceInput, SaveButton, SelectInput, SimpleFormIterator, TabbedForm, TextInput, useRecordContext, useSourceContext, useGetOne } from 'react-admin';
import { quoteEnums, quoteFields, quoteText } from '../i18n/quotes';
import { useWatch } from 'react-hook-form';
import EditHeader from '../components/EditHeader';
import FormToolbar from '../components/FormToolbar';
import ResponsiveTabbedFormTabs from '../components/ResponsiveTabbedFormTabs';
import Section from '../components/Section';
import { formPageSx } from '../styles/pages';
import { parametersGridSx } from '../styles/quotes';
import type { Measurement, MeasurementRoom } from '../types/api';
import type { Quote, ZoneTypeValues } from '../types/quotes';
import { fractionToPercent, number, percentToFraction } from './format';
const select = (source: string, values: string[]): ReactElement => <SelectInput source={source} label={quoteFields[source]} choices={values.map((id: string): {
    id: string;
    name: string;
} => ({ id, name: quoteEnums[id] }))} translateChoice={false} fullWidth/>;
const numeric = (source: string): ReactElement => <NumberInput source={source} label={quoteFields[source]} min={0} step={['toilets', 'urinals', 'sinks', 'fixedPosts'].includes(source) ? 1 : 'any'} fullWidth/>;
const reference = (source: string, resource: string): ReactElement => <ReferenceInput source={source} reference={resource} perPage={1000}><SelectInput label={quoteFields[source]} fullWidth/></ReferenceInput>;
/** A grid cell of a quote form: half the row from `md` unless told otherwise. */
const Cell = ({ children, size = 6 }: { children: ReactNode; size?: number }): ReactElement => <Grid size={{ xs: 12, md: size }}>{children}</Grid>;
const OriginalMeasurementContext: Context<Measurement | undefined> = createContext<Measurement | undefined>(undefined);
const OriginalMeasurement = ({ children }: { children:ReactNode }): ReactElement => {
    const quote: Quote | undefined = useRecordContext<Quote>();
    const { data } = useGetOne<Measurement>('measurements',{ id:quote?.measurementId ?? 0 },{ enabled:!!quote?.measurementId });
    return <OriginalMeasurementContext.Provider value={data}>{children}</OriginalMeasurementContext.Provider>;
};
const ScanHint = (): ReactElement | null => {
    const measurement: Measurement | undefined = useContext(OriginalMeasurementContext);
    const { getSource } = useSourceContext();
    const roomId: string | null = useWatch({ name:getSource('roomId') }) as string | null;
    const room: MeasurementRoom | undefined = measurement?.rooms.find((r: MeasurementRoom): boolean => r.id === roomId);
    return room ? <Typography variant="caption" color="text.secondary">{quoteText.scan} {number(room.floorArea)} m²</Typography> : null;
};
const SuggestedTerminals = (): ReactElement => {
  const { getSource } = useSourceContext();
  const id: number | null = useWatch({ name:getSource('zoneTypeId') }) as number | null;
  const { data } = useGetOne<ZoneTypeValues>('quote-zone-types',{ id:id ?? 0 },{ enabled:!!id });
  return <NumberInput source="terminalsPerMonth" label={quoteFields.terminalsPerMonth} min={0} placeholder={String(data?.suggestedTerminalsPerMonth ?? '')} helperText={quoteText.terminalSuggestion} fullWidth />;
};
/**
 * Saves the form and confirms the quote, or takes the confirmation back. Only a confirmed quote,
 * with no other causes left, becomes Confirmado and can be exported.
 */
const ConfirmQuoteButton = (): ReactElement | null => {
    const quote: Quote | undefined = useRecordContext<Quote>();
    if (!quote)
        return null;
    const confirmed: boolean = quote.assumptionsConfirmed;
    return <SaveButton type="button" alwaysEnable variant={confirmed ? 'text' : 'outlined'} label={confirmed ? quoteText.unconfirm : quoteText.confirm} icon={confirmed ? <RemoveDoneIcon/> : <TaskAltIcon/>} transform={(data: Quote): Quote => ({ ...data, assumptionsConfirmed: !confirmed })}/>;
};
/**
 * A quote's inputs in two tabs, since a quote with many zones is far longer than one page should be:
 * the case's data, then the zones, each in sections. The Zonas tab has its own address
 * (/quotes/:id/zones), so a zone's "Editar zona" opens it directly.
 */
export function QuoteEdit(): ReactElement {
    return <Edit mutationMode="pessimistic" redirect="show" actions={<EditHeader />} sx={formPageSx}><OriginalMeasurement><TabbedForm tabs={<ResponsiveTabbedFormTabs />} toolbar={<FormToolbar withDelete actions={<ConfirmQuoteButton />} />}>
    <TabbedForm.Tab label={quoteText.caseData}>
    <Grid container spacing={2} sx={parametersGridSx}>
    <Cell><TextInput source="name" label={quoteFields.name} required fullWidth/></Cell>
    <Cell>{select('installationType', ['privateHospital', 'publicHospital', 'office', 'mall', 'other'])}</Cell>
    <Cell size={4}><TextInput source="city" label={quoteFields.city} fullWidth/></Cell>
    <Cell size={4}><DateInput source="visitDate" label={quoteFields.visitDate} fullWidth/></Cell>
    <Cell size={4}>{select('measurementOrigin', ['siteVisit', 'plans', 'estimate'])}</Cell>
    <Cell size={4}><NumberInput source="manualPrice" label={quoteFields.manualPrice} min={0} helperText={quoteText.manualPriceAdvice} fullWidth/></Cell>
    <Cell size={4}><NumberInput source="targetMargin" label={`${quoteFields.targetMargin} (%)`} min={0} max={99.99} step="any" format={fractionToPercent} parse={percentToFraction} helperText={quoteText.targetMarginAdvice} fullWidth/></Cell>
    <Cell size={4}><NumberInput source="externalReferencePrice" label={quoteFields.externalReferencePrice} min={0} helperText={quoteText.referenceAdvice} fullWidth/></Cell>
    <Cell size={12}><TextInput source="notes" label={quoteFields.notes} multiline minRows={2} fullWidth/></Cell>
    </Grid>
    </TabbedForm.Tab>
    <TabbedForm.Tab label={quoteText.zones} path="zones">
    <Alert severity="info" sx={{ width: '100%', mb: 1 }}>{quoteText.manualEditsAdvice}</Alert>
    <ArrayInput source="zones" label={false}><SimpleFormIterator disableReordering={false} getItemLabel={(index: number): string => `${quoteText.zone} ${index + 1}`}>
    <ScanHint />
    <Section title={quoteText.zone}>
    <Cell><TextInput source="name" label={quoteFields.name} required fullWidth/></Cell>
    <Cell>{reference('zoneTypeId', 'quote-zone-types')}</Cell>
    <Cell size={4}>{select('measurementSource', ['measured', 'plans', 'estimated'])}</Cell>
    <Cell size={8}><TextInput source="observation" label={quoteFields.observation} fullWidth/></Cell>
    </Section>
    <Section title={quoteText.areas}>
    <Cell size={4}>{numeric('floorArea')}</Cell>
    <Cell size={4}>{numeric('wallArea')}</Cell>
    </Section>
    <Section title={quoteText.operation}>
    <Cell size={4}>{select('traffic', ['low', 'medium', 'high'])}</Cell>
    <Cell size={4}>{reference('scheduleId', 'quote-schedules')}</Cell>
    <Cell size={4}>{numeric('daysPerMonth')}</Cell>
    <Cell size={4}><SuggestedTerminals /></Cell>
    <Cell size={4}>{numeric('fixedPosts')}</Cell>
    </Section>
    <Section title={quoteText.fixtures}>
    {['toilets', 'urinals', 'sinks', 'fixtureVisitsPerDay', 'minutesPerFixture', 'solutionLitersPerFixture', 'paperSoapMonthly'].map((source: string): ReactElement => <Cell key={source} size={4}>{numeric(source)}</Cell>)}
    <Cell size={4}><BooleanInput source="fixturesExcludeFloor" label={quoteFields.fixturesExcludeFloor}/></Cell>
    </Section>
    </SimpleFormIterator></ArrayInput>
    </TabbedForm.Tab>
    </TabbedForm></OriginalMeasurement></Edit>;
}
