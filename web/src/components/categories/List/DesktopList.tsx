import type { ReactElement } from 'react';
import { BulkDeleteButton, DataTable, List, TextField } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import { NONE } from '../../../constants/components';
import type { Category } from '../../../types/api';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import DesktopActions from './DesktopActions';
import { categoryFilters } from './categoryFilters';

/** The categories as a table; a row opens its edit form. Deleting asks first and waits for the API. */
const DesktopList = (): ReactElement => (
  <List
    filters={categoryFilters}
    sort={CATALOG_SORT}
    actions={<DesktopActions />}
    pagination={<AppPagination />}
    empty={<EmptyState variant="page" />}
  >
    <DataTable<Category>
      rowClick="edit"
      bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}
      empty={<EmptyState />}
    >
      <DataTable.Col source="name" />
      <DataTable.Col source="description" disableSort>
        <TextField source="description" emptyText={NONE} />
      </DataTable.Col>
    </DataTable>
  </List>
);

export default DesktopList;
