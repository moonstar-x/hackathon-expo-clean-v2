import type { ReactElement } from 'react';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { BooleanField, DataTable, List, ReferenceField } from 'react-admin';
import { PRODUCT_DEFAULT_FILTER, PRODUCT_PER_PAGE, PRODUCT_SORT } from '../../../constants/products';
import { noWrapCellSx } from '../../../styles/list';
import { lowStockRowSx } from '../../../styles/products';
import type { Product } from '../../../types/api';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import MoneyField from '../../fields/MoneyField';
import QuantityField from '../../fields/QuantityField';
import StockStatusBadge from '../../fields/StockStatusBadge';
import DesktopActions from './DesktopActions';
import { productFilters } from './productFilters';

/** The products as a table with numbered pages; low-stock rows are tinted. Bulk delete is off (SPEC-002). */
const DesktopList = (): ReactElement => {
  const theme: Theme = useTheme();
  const rowSx = (record: Product): SxProps => lowStockRowSx(theme, record);
  return (
    <List
      filters={productFilters(true)}
      filterDefaultValues={PRODUCT_DEFAULT_FILTER}
      sort={PRODUCT_SORT}
      perPage={PRODUCT_PER_PAGE}
      actions={<DesktopActions />}
      pagination={<AppPagination />}
      empty={<EmptyState variant="page" />}
    >
      <DataTable<Product>
        rowClick="show"
        rowSx={rowSx}
        bulkActionButtons={false}
        empty={<EmptyState defaultFilters={PRODUCT_DEFAULT_FILTER} />}
      >
        <DataTable.Col source="sku" cellSx={noWrapCellSx} />
        <DataTable.Col source="name" />
        <DataTable.Col source="categoryId">
          <ReferenceField source="categoryId" reference="categories" link={false} />
        </DataTable.Col>
        <DataTable.Col source="quantity" align="right">
          <QuantityField source="quantity" />
        </DataTable.Col>
        <DataTable.Col source="reorderLevel" align="right">
          <QuantityField source="reorderLevel" />
        </DataTable.Col>
        <DataTable.Col source="unitCost" align="right">
          <MoneyField source="unitCost" />
        </DataTable.Col>
        <DataTable.Col source="stockValue" align="right">
          <MoneyField source="stockValue" />
        </DataTable.Col>
        <DataTable.Col label="resources.products.fields.status" disableSort>
          <StockStatusBadge />
        </DataTable.Col>
        <DataTable.Col source="active" field={BooleanField} />
      </DataTable>
    </List>
  );
};

export default DesktopList;
