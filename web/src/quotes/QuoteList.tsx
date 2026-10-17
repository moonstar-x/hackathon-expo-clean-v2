import DescriptionIcon from '@mui/icons-material/Description';
import { Link as RouterLink } from 'react-router-dom';
import { quoteFields, quoteEnums, quoteText } from '../i18n/quotes';
import type { ReactElement } from 'react';
import { Button, Chip } from '@mui/material';
import { BooleanInput, DataTable, DateField, DateInput, List, SelectInput, TextInput, useRecordContext } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import { formatCurrency } from '../utils/format';
import type { Quote } from '../types/quotes';
import { QuoteStatus, StateChip } from './Chips';
import { number, percent } from './format';
const Status = (): ReactElement | null => { const q: Quote | undefined = useRecordContext<Quote>(); return q ? <QuoteStatus quote={q}/> : null; };
export function QuoteList(): ReactElement {
    const { currency }: {
        currency: string;
    } = useAppConfig();
    return <List sort={{ field: 'createdAt', order: 'DESC' }} filters={[<TextInput source="q" key="q" label={quoteFields.q} alwaysOn/>, <SelectInput source="status" key="status" label={quoteFields.status} choices={[{ id: 'needsReview', name: quoteEnums.needsReview }, { id: 'simulation', name: quoteEnums.simulation }]}/>, <BooleanInput source="isStale" key="stale" label={quoteFields.isStale}/>, <DateInput source="createdAt_gte" key="from" label={quoteFields.createdAt_gte}/>, <DateInput source="createdAt_lte" key="to" label={quoteFields.createdAt_lte}/>]}><DataTable<Quote> rowClick="show" bulkActionButtons={false}>
    <DataTable.Col source="name"/>
    <DataTable.Col source="status"><Status /></DataTable.Col>
    <DataTable.Col source="offeredPrice" label={quoteFields.offeredPrice} render={(q: Quote): string => formatCurrency(q.summary.offeredPrice, currency)}/>
    <DataTable.Col source="totalCost" label={quoteFields.totalCost} render={(q: Quote): string => formatCurrency(q.summary.totalCost, currency)}/>
    <DataTable.Col source="margin" label={quoteFields.margin} render={(q: Quote): ReactElement => <>{percent(q.summary.margin)} <StateChip value={q.summary.marginStatus}/></>}/>
    <DataTable.Col source="totalFloorArea" label={quoteFields.totalFloorArea} render={(q: Quote): string => number(q.summary.totalFloorArea)}/>
    <DataTable.Col source="fte" label={quoteFields.fte} render={(q: Quote): string => number(q.summary.fte)}/>
    <DataTable.Col source="calculatedAt" label={quoteFields.calculatedAt}><DateField source="calculation.calculatedAt" locales="es" showTime/></DataTable.Col>
    <DataTable.Col label="Parámetros" disableSort render={(q: Quote): ReactElement | null => q.calculation.isStale ? <Chip size="small" color="warning" label={quoteText.stale}/> : null}/>
    <DataTable.Col label="Documento" disableSort render={(q: Quote): ReactElement => <Button component={RouterLink} to={`/quotes/${q.id}/document`} startIcon={<DescriptionIcon />} onClick={(e: React.MouseEvent): void => e.stopPropagation()}>Documento</Button>} />
    </DataTable></List>;
}
