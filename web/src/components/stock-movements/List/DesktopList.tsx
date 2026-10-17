import type { ReactElement } from 'react';
import { DataTable, DateField, List, ReferenceField, TextField } from 'react-admin';
import { NONE } from '../../../constants/components';
import { MOVEMENT_PER_PAGE, MOVEMENT_SORT } from '../../../constants/stockMovements';
import type { StockMovement } from '../../../types/api';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import MovementQuantityField from '../../fields/MovementQuantityField';
import MovementReasonField from '../../fields/MovementReasonField';
import MovementTypeBadge from '../../fields/MovementTypeBadge';
import DesktopActions from './DesktopActions';
import { movementFilters } from './movementFilters';

/** The movements as a table, newest first; only the columns the API can sort by sort. No bulk actions. */
const DesktopList = (): ReactElement => (
  <List
    filters={movementFilters}
    sort={MOVEMENT_SORT}
    perPage={MOVEMENT_PER_PAGE}
    actions={<DesktopActions />}
    pagination={<AppPagination />}
    empty={<EmptyState variant="page" />}
  >
    <DataTable<StockMovement> rowClick="show" bulkActionButtons={false} empty={<EmptyState />}>
      <DataTable.Col source="createdAt">
        <DateField source="createdAt" showTime />
      </DataTable.Col>
      <DataTable.Col source="productId">
        <ReferenceField source="productId" reference="products" link="show" />
      </DataTable.Col>
      <DataTable.Col source="type">
        <MovementTypeBadge />
      </DataTable.Col>
      <DataTable.Col source="quantity" align="right">
        <MovementQuantityField source="quantity" />
      </DataTable.Col>
      <DataTable.Col source="delta" align="right">
        <MovementQuantityField source="delta" signed />
      </DataTable.Col>
      <DataTable.Col source="balanceAfter" align="right" disableSort>
        <MovementQuantityField source="balanceAfter" />
      </DataTable.Col>
      <DataTable.Col source="reason" disableSort>
        <MovementReasonField source="reason" />
      </DataTable.Col>
      <DataTable.Col source="reference" disableSort>
        <TextField source="reference" emptyText={NONE} />
      </DataTable.Col>
      <DataTable.Col source="createdBy" disableSort />
    </DataTable>
  </List>
);

export default DesktopList;
