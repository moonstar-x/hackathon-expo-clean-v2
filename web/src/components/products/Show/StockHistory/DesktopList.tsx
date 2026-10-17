import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { DataTable, DateField, TextField } from 'react-admin';
import { NONE } from '../../../../constants/components';
import { noWrapCellSx } from '../../../../styles/list';
import { historyTableSx } from '../../../../styles/products';
import type { StockMovement } from '../../../../types/api';
import MovementQuantityField from '../../../fields/MovementQuantityField';
import MovementReasonField from '../../../fields/MovementReasonField';
import MovementTypeBadge from '../../../fields/MovementTypeBadge';
import EmptyState from '../../../list/EmptyState';

/**
 * The history as a table, inset from the card's sides; only the columns the API can sort by sort, and
 * the date stays on one line. Labels from resources.stock-movements.
 */
const DesktopList = (): ReactElement => (
  <Box sx={historyTableSx}>
    <DataTable<StockMovement>
      bulkActionButtons={false}
      rowClick="show"
      empty={<EmptyState variant="compact" messages="app.empty.history" action={false} />}
    >
      <DataTable.Col source="createdAt" cellSx={noWrapCellSx}>
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
  </Box>
);

export default DesktopList;
