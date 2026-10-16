import type { ReactElement } from 'react';
import { BulkDeleteButton, DataTable, EmailField, List, TextField } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import { NONE } from '../../../constants/components';
import type { Supplier } from '../../../types/api';
import AppPagination from '../../AppPagination';
import DesktopActions from './DesktopActions';
import { supplierFilters } from './supplierFilters';

/** The suppliers as a table; a row opens its edit form. Deleting asks first and waits for the API. */
const DesktopList = (): ReactElement => (
  <List filters={supplierFilters} sort={CATALOG_SORT} actions={<DesktopActions />} pagination={<AppPagination />}>
    <DataTable<Supplier> rowClick="edit" bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}>
      <DataTable.Col source="name" />
      <DataTable.Col source="contactName" label="app.suppliers.contact">
        <TextField source="contactName" emptyText={NONE} />
      </DataTable.Col>
      <DataTable.Col source="email">
        <EmailField source="email" emptyText={NONE} />
      </DataTable.Col>
      <DataTable.Col source="phone" disableSort>
        <TextField source="phone" emptyText={NONE} />
      </DataTable.Col>
    </DataTable>
  </List>
);

export default DesktopList;
