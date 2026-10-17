import type { ReactElement } from 'react';
import { DataTable, DateField, TextField } from 'react-admin';
import { NONE } from '../../../../constants/components';
import type { StockMovement } from '../../../../types/api';
import MovementQuantityField from '../../../fields/MovementQuantityField';
import MovementReasonField from '../../../fields/MovementReasonField';
import MovementTypeBadge from '../../../fields/MovementTypeBadge';
import EmptyState from '../../../list/EmptyState';

/** The history as a table; only the columns the API can sort by sort. Labels from resources.stock-movements. */
const DesktopList = (): ReactElement => (
  <DataTable<StockMovement>
    bulkActionButtons={false}
    rowClick="show"
    empty={<EmptyState variant="compact" messages="app.empty.history" action={false} />}
  >
    <DataTable.Col source="createdAt">
      <DateField source="createdAt" showTime />
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
);

export default DesktopList;
