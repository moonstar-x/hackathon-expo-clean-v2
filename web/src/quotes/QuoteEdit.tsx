import { createContext, useContext, type Context, type ReactElement, type ReactNode } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { ArrayInput, BooleanInput, DateInput, Edit, NumberInput, ReferenceInput, SelectInput, SimpleForm, SimpleFormIterator, TextInput, useRecordContext, useSourceContext, useGetOne } from 'react-admin';
import { quoteEnums, quoteFields, quoteText } from '../i18n/quotes';
import { useWatch } from 'react-hook-form';
import type { Measurement, MeasurementRoom } from '../types/api';
import type { Quote, ZoneTypeValues } from '../types/quotes';
import { number } from './format';
const select = (source: string, values: string[]): ReactElement => <SelectInput source={source} label={quoteFields[source]} choices={values.map((id: string): {
    id: string;
    name: string;
} => ({ id, name: quoteEnums[id] }))} fullWidth/>;
const numeric = (source: string): ReactElement => <NumberInput key={source} source={source} label={quoteFields[source]} min={0} step={['toilets', 'urinals', 'sinks', 'fixedPosts'].includes(source) ? 1 : 'any'} fullWidth/>;
const reference = (source: string, resource: string): ReactElement => <ReferenceInput source={source} reference={resource} perPage={1000}><SelectInput label={quoteFields[source]} fullWidth/></ReferenceInput>;
const Group = ({ title, children }: {
    title: string;
    children: ReactNode;
}): ReactElement => <Box sx={{ width: '100%', mt: 2 }}>
<Typography variant="h6">{title}</Typography>
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{children}</Box>
</Box>;
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
    return room ? <Typography variant="caption">{quoteText.scan} {number(room.floorArea)} m²</Typography> : null;
};
const SuggestedTerminals = (): ReactElement => {
  const { getSource } = useSourceContext();
  const id: number | null = useWatch({ name:getSource('zoneTypeId') }) as number | null;
  const { data } = useGetOne<ZoneTypeValues>('quote-zone-types',{ id:id ?? 0 },{ enabled:!!id });
  return <NumberInput source="terminalsPerMonth" label={quoteFields.terminalsPerMonth} min={0} placeholder={String(data?.suggestedTerminalsPerMonth ?? '')} helperText={quoteText.terminalSuggestion} />;
};
export function QuoteEdit(): ReactElement {
    return <Edit mutationMode="pessimistic" redirect="show"><OriginalMeasurement><SimpleForm>
    <Group title={quoteText.caseData}>
    <TextInput source="name" label={quoteFields.name} required fullWidth/>
    {select('installationType', ['privateHospital', 'publicHospital', 'office', 'mall', 'other'])}
    <TextInput source="city" label={quoteFields.city} fullWidth/>
    <DateInput source="visitDate" label={quoteFields.visitDate}/>
    {select('measurementOrigin', ['siteVisit', 'plans', 'estimate'])}
    <BooleanInput source="assumptionsConfirmed" label={quoteFields.assumptionsConfirmed} helperText={quoteText.reviewAdvice}/>
    <NumberInput source="manualPrice" label={quoteFields.manualPrice} min={0} helperText={quoteText.manualPriceAdvice}/>
    <NumberInput source="externalReferencePrice" label={quoteFields.externalReferencePrice} min={0} helperText={quoteText.referenceAdvice}/>
    <TextInput source="notes" label={quoteFields.notes} multiline fullWidth/>
    </Group>
    <Typography variant="h5" sx={{ mt: 3 }}>{quoteText.zones}</Typography>
    <Alert severity="info">{quoteText.manualEditsAdvice}</Alert>
    <ArrayInput source="zones" label={false}><SimpleFormIterator disableReordering={false} getItemLabel={(index: number): string => `${quoteText.zone} ${index + 1}`}>
    <ScanHint />
    <Group title={quoteText.zone}>
    <TextInput source="name" label={quoteFields.name} required fullWidth/>
    {reference('zoneTypeId', 'quote-zone-types')}
    {select('measurementSource', ['measured', 'plans', 'estimated'])}
    <TextInput source="observation" label={quoteFields.observation} fullWidth/>
    </Group>
    <Group title={quoteText.areas}>
    {numeric('floorArea')}
    {numeric('wallArea')}
    </Group>
    <Group title={quoteText.operation}>
    {select('traffic', ['low', 'medium', 'high'])}
    {reference('scheduleId', 'quote-schedules')}
    {numeric('daysPerMonth')}
    <SuggestedTerminals />
    {numeric('fixedPosts')}
    </Group>
    <Group title={quoteText.fixtures}>
    {['toilets', 'urinals', 'sinks', 'fixtureVisitsPerDay', 'minutesPerFixture', 'solutionLitersPerFixture', 'paperSoapMonthly'].map(numeric)}
    <BooleanInput source="fixturesExcludeFloor" label={quoteFields.fixturesExcludeFloor}/>
    </Group>
    </SimpleFormIterator></ArrayInput>
    </SimpleForm></OriginalMeasurement></Edit>;
}
