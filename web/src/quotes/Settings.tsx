import type { ReactElement } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { AutocompleteInput, BooleanField, BooleanInput, Create, DataTable, Edit, List, NumberField, NumberInput, ReferenceField, ReferenceInput, SelectInput, SimpleForm, TextInput, useRecordContext } from 'react-admin';
import { parameterFields } from './parameterFields';
import { quoteEnums, quoteFields, quoteText } from '../i18n/quotes';
import { fractionToPercent, percentToFraction } from './format';
interface Field {
    name: string;
    label?: string;
    type?: 'boolean' | 'number' | 'fraction' | 'select' | 'text' | 'reference';
    reference?: string;
    choices?: string[];
}
const choices = (values: string[]): {
    id: string;
    name: string;
}[] => values.map((id: string): {
    id: string;
    name: string;
} => ({ id, name: quoteEnums[id] ?? id }));
const ref = (source: string, reference: string, label: string = quoteFields[source]): ReactElement => <ReferenceInput key={source} source={source} reference={reference} perPage={1000}><AutocompleteInput label={label} optionText="name" fullWidth/></ReferenceInput>;
function Input({ field }: {
    field: Field;
}): ReactElement {
    const { name, type, reference, choices: values }: Field = field;
    const label: string = field.label ?? quoteFields[name];
    if (reference)
        return ref(name, reference, label);
    if (type === 'boolean')
        return <BooleanInput source={name} label={label}/>;
    if (type === 'select')
        return <SelectInput source={name} label={label} choices={choices(values ?? [])} fullWidth/>;
    if (type === 'number' || type === 'fraction')
        return <NumberInput source={name} label={label} min={0} step="any" format={type === 'fraction' ? fractionToPercent : undefined} parse={type === 'fraction' ? percentToFraction : undefined} fullWidth/>;
    return <TextInput source={name} label={label} fullWidth multiline={name === 'note'}/>;
}
const catalogFields: Record<string, Field[]> = {
    'quote-schedules': [{ name: 'code' }, { name: 'name' }, { name: 'serviceHoursPerDay', type: 'number' }, { name: 'nightHoursFraction', type: 'fraction' }, { name: 'includesHolidays', type: 'boolean' }, { name: 'note' }, { name: 'active', type: 'boolean' }],
    'quote-products': [{ name: 'name' }, { name: 'use' }, { name: 'presentationSize', type: 'number' }, { name: 'unit', type: 'select', choices: [quoteEnums.L, quoteEnums.kg] }, { name: 'publishedPrice', type: 'number' }, { name: 'publishedPriceIncludesVat', type: 'boolean' }, { name: 'dosePerLiter', type: 'number' }, { name: 'stockContainers', type: 'number' }, { name: 'inventoryProductId', reference: 'products' }, { name: 'presentationStatus' }, { name: 'sourceUrl' }, { name: 'note' }, { name: 'active', type: 'boolean' }],
    'quote-zone-types': [{ name: 'code' }, { name: 'name' }, { name: 'risk', type: 'select', choices: ['critical', 'semicritical', 'noncritical'] }, { name: 'dailyRateM2PerHour', type: 'number' }, { name: 'terminalRateM2PerHour', type: 'number' }, ...['low', 'medium', 'high'].map((v: string): Field => ({ name: `hoursBetweenCleanings.${v}`, label: `${quoteText.cleaningIntervals} ${quoteEnums[v].toLowerCase()}`, type: 'number' })), { name: 'wallsInTerminal', type: 'boolean' }, { name: 'suggestedTerminalsPerMonth', type: 'number' }, ...['cleaningProductId', 'dailyDisinfectantId', 'terminalDisinfectantId'].map((name: string): Field => ({ name, reference: 'quote-products' })), { name: 'solutionLitersPerM2', type: 'number' }, { name: 'countsFixtures', type: 'boolean' }, { name: 'note' }, { name: 'active', type: 'boolean' }],
    'quote-location-types': [{ name: 'zoneTypeId', reference: 'quote-zone-types' }],
};
const ProductComputed = (): ReactElement | null => {
    const record: Record<string, unknown> | undefined = useRecordContext();
    if (!record || !record.id)
        return null;
    return <Box sx={{ my: 2 }}>
    {['pricePerContainer', 'pricePerUnit', 'costPerLiterOfSolution', 'effectiveStock'].map((k: string): ReactElement => <Typography key={k}>{quoteFields[k]}: {Number(record[k]).toLocaleString('es', { maximumFractionDigits: 4 })}</Typography>)}
    <Typography>{quoteText.dose} {record.unit === quoteEnums.L ? 'ml' : 'g'} {quoteText.perLiterWater}</Typography>
    </Box>;
};
const CatalogForm = ({ resource }: {
    resource: string;
}): ReactElement => <SimpleForm defaultValues={{ active: true }}>
<Alert severity="info">{quoteText.settingsAdvice}</Alert>
{catalogFields[resource].map((field: Field): ReactElement => <Input key={field.name} field={field}/>)}
{resource === 'quote-products' && <ProductComputed />}
</SimpleForm>;
export const CatalogEdit = ({ resource }: {
    resource: string;
}): ReactElement => <Edit resource={resource} mutationMode="pessimistic"><CatalogForm resource={resource}/></Edit>;
export const CatalogCreate = ({ resource }: {
    resource: string;
}): ReactElement => <Create resource={resource}><CatalogForm resource={resource}/></Create>;
export const CatalogList = ({ resource }: {
    resource: string;
}): ReactElement => <List resource={resource} filters={[<TextInput key="q" source="q" label={quoteFields.q} alwaysOn/>, ...(resource === 'quote-location-types' ? [<SelectInput key="unmapped" source="zoneTypeId" label={quoteText.equivalence} choices={[{ id: 'unmapped', name: quoteText.unmapped }]}/>] : [])]} sort={{ field: resource === 'quote-location-types' ? 'label' : resource === 'quote-schedules' ? 'serviceHoursPerDay' : 'name', order: 'ASC' }}><DataTable rowClick="edit" bulkActionButtons={false}>{resource === 'quote-location-types' ? <><DataTable.Col source="label"/><DataTable.Col source="zoneTypeId"><ReferenceField source="zoneTypeId" reference="quote-zone-types" link={false}/></DataTable.Col></> : <><DataTable.Col source="name"/>{resource === 'quote-zone-types' && <DataTable.Col source="risk" render={(r: Record<string, unknown>): string => quoteEnums[r.risk as string]}/>}{resource === 'quote-schedules' && <DataTable.Col source="serviceHoursPerDay"/>}{resource === 'quote-products' && ['pricePerContainer', 'pricePerUnit', 'costPerLiterOfSolution', 'effectiveStock'].map((k: string): ReactElement => <DataTable.Col source={k} key={k} disableSort><NumberField source={k} locales="es"/></DataTable.Col>)}<DataTable.Col source="active"><BooleanField source="active"/></DataTable.Col></>}</DataTable></List>;
export const parameterGroups: [
    string,
    number,
    number
][] = [[quoteText.payrollGroup, 0, 15], [quoteText.supervisionGroup, 15, 22], [quoteText.fixedGroup, 22, 27], [quoteText.marginGroup, 27, 31], [quoteText.chemicalsGroup, 31, 33], [quoteText.comparisonGroup, 33, 35], [quoteText.defaultsGroup, 35, 39], [quoteText.fixturesGroup, 39, 44]];
export function ParameterInputs(): ReactElement {
    const record: {
        notes?: Record<string, string>;
    } | undefined = useRecordContext();
    return <Box sx={{ width: '100%' }}>
    <Alert severity="info" sx={{ mb: 2 }}>{quoteText.settingsAdvice}</Alert>
    {parameterGroups.map(([title, start, end]: [
        string,
        number,
        number
    ]): ReactElement => <Card key={title} variant="outlined" sx={{ mb: 2 }}><CardContent>
    <Typography variant="h6" gutterBottom>{title}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{parameterFields.slice(start, end).map((f: typeof parameterFields[number]): ReactElement => <Box key={f.name}>{f.name === 'defaultScheduleId' || f.name === 'defaultZoneTypeId' ? ref(f.name, f.name === 'defaultScheduleId' ? 'quote-schedules' : 'quote-zone-types', f.label) : f.name === 'defaultTraffic' ? <SelectInput source={f.name} label={f.label} choices={choices(['low', 'medium', 'high'])} fullWidth/> : f.boolean ? <BooleanInput source={f.name} label={f.label}/> : <NumberInput source={f.name} label={`${f.label}${f.percentage ? ' (%)' : ''}`} min={0} step="any" format={f.percentage ? fractionToPercent : undefined} parse={f.percentage ? percentToFraction : undefined} helperText={record?.notes?.[f.name]} fullWidth/>}</Box>)}</Box>
    <Accordion elevation={0}><AccordionSummary>{quoteText.editNotes}</AccordionSummary><AccordionDetails>{parameterFields.slice(start,end).map((f: typeof parameterFields[number]): ReactElement => <TextInput key={f.name} source={`notes.${f.name}`} label={f.label} fullWidth />)}</AccordionDetails></Accordion>
    </CardContent></Card>)}
    </Box>;
}
export const ParametersEdit = (): ReactElement => <Edit resource="quote-parameters" id={1} mutationMode="pessimistic" redirect={false}><SimpleForm><ParameterInputs /></SimpleForm></Edit>;
