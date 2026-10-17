import type { ReactElement } from 'react';
import { BulkDeleteButton, DataTable, DateField, FunctionField, List } from 'react-admin';
import { TDR_EMPTY_STEPS, TDR_PER_PAGE, TDR_SORT } from '../../../constants/tdr';
import type { TdrDocument } from '../../../types/tdr';
import { tdrRefetchInterval } from '../../../utils/tdr';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import TdrStatusBadge from '../TdrStatusBadge';
import DesktopActions from './DesktopActions';
import TdrQuoteCell from './TdrQuoteCell';
import TdrTitle from './TdrTitle';
import { tdrFilters } from './tdrFilters';

/**
 * The documents as a table, newest upload first. It asks again every 2 s while one is still
 * analyzed, so its badge turns to Listo on its own. A row opens the document's review.
 */
const DesktopList = (): ReactElement => (
  <List
    filters={tdrFilters}
    sort={TDR_SORT}
    perPage={TDR_PER_PAGE}
    actions={<DesktopActions />}
    pagination={<AppPagination />}
    empty={<EmptyState variant="page" steps={TDR_EMPTY_STEPS} />}
    queryOptions={{ refetchInterval: tdrRefetchInterval }}
  >
    <DataTable<TdrDocument> rowClick="edit" bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />} empty={<EmptyState />}>
      <DataTable.Col source="fileName" label="resources.tdr-documents.fields.title">
        <TdrTitle />
      </DataTable.Col>
      <DataTable.Col source="status">
        <FunctionField<TdrDocument> render={(doc: TdrDocument): ReactElement => <TdrStatusBadge status={doc.status} dense />} />
      </DataTable.Col>
      <DataTable.Col source="zoneCount" align="right" disableSort />
      <DataTable.Col source="quoteId" disableSort>
        <TdrQuoteCell />
      </DataTable.Col>
      <DataTable.Col source="createdBy" disableSort />
      <DataTable.Col source="createdAt">
        <DateField source="createdAt" showTime />
      </DataTable.Col>
    </DataTable>
  </List>
);

export default DesktopList;
