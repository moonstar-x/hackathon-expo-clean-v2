import type { ReactElement } from 'react';
import { DataTable, DateField, List, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../../AppConfigContext';
import { QUOTE_SORT } from '../../../constants/quotes';
import { number } from '../../../quotes/format';
import type { Quote } from '../../../types/quotes';
import { formatCurrency } from '../../../utils/format';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import OutlinedBadge from '../../list/OutlinedBadge';
import DesktopActions from './DesktopActions';
import DocumentButton from './DocumentButton';
import MarginField from './MarginField';
import { quoteFilters } from './quoteFilters';
import QuoteStatusField from './QuoteStatusField';
import SeeMeasurementsButton from './SeeMeasurementsButton';

/** The quotes as a table, newest first; a row opens the quote. Labels come from resources.quotes.fields. */
const DesktopList = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { currency } = useAppConfig();
  return (
    <List
      sort={QUOTE_SORT}
      filters={quoteFilters}
      actions={<DesktopActions />}
      pagination={<AppPagination />}
      empty={<EmptyState variant="page" action={<SeeMeasurementsButton />} />}
    >
      <DataTable<Quote> rowClick="show" bulkActionButtons={false} empty={<EmptyState />}>
        <DataTable.Col source="name" />
        <DataTable.Col source="status">
          <QuoteStatusField />
        </DataTable.Col>
        <DataTable.Col
          source="offeredPrice"
          align="right"
          render={(quote: Quote): string => formatCurrency(quote.summary.offeredPrice, currency)}
        />
        <DataTable.Col
          source="totalCost"
          align="right"
          render={(quote: Quote): string => formatCurrency(quote.summary.totalCost, currency)}
        />
        <DataTable.Col source="margin">
          <MarginField />
        </DataTable.Col>
        <DataTable.Col source="totalFloorArea" align="right" render={(quote: Quote): string => number(quote.summary.totalFloorArea)} />
        <DataTable.Col source="fte" align="right" render={(quote: Quote): string => number(quote.summary.fte)} />
        <DataTable.Col source="calculatedAt">
          <DateField source="calculation.calculatedAt" showTime />
        </DataTable.Col>
        <DataTable.Col
          label="app.quotes.parameters"
          disableSort
          render={(quote: Quote): ReactElement | null =>
            quote.calculation.isStale ? <OutlinedBadge label={translate('app.quotes.stale')} tone="orange" dense /> : null
          }
        />
        <DataTable.Col label="app.quotes.document" disableSort>
          <DocumentButton size="small" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};

export default DesktopList;
