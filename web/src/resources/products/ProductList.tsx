import {
  AutocompleteInput,
  BooleanField,
  BooleanInput,
  Datagrid,
  List,
  NullableBooleanInput,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  TextField,
} from 'react-admin';
import { MoneyField, QuantityField, StockStatusField } from '../../components/fields';
import type { Product } from '../../types';

/**
 * Only `true` is sent. Switching the toggle off must remove the filter rather than send
 * `false` (which means "not low stock"). react-admin ignores an `undefined` change but
 * strips empty strings from the filter, so off becomes ''.
 */
const trueOrRemove = (value: boolean) => (value ? true : '');

const productFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search SKU, name, description" />,
  <ReferenceInput key="categoryId" source="categoryId" reference="categories" sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput label="Category" optionText="name" />
  </ReferenceInput>,
  <ReferenceInput key="supplierId" source="supplierId" reference="suppliers" sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput label="Supplier" optionText="name" />
  </ReferenceInput>,
  <NullableBooleanInput key="active" source="active" label="Active" />,
  <NullableBooleanInput key="hazardous" source="hazardous" label="Hazardous" />,
  <BooleanInput key="lowStock" source="lowStock" label="Low stock only" alwaysOn parse={trueOrRemove} />,
  <BooleanInput key="outOfStock" source="outOfStock" label="Out of stock only" parse={trueOrRemove} />,
];

/** Subtle orange tint (MUI's warning colour at 8%) that works on light and dark backgrounds. */
const lowStockRowSx = (record: Product) => (record.isLowStock ? { backgroundColor: 'rgba(237, 108, 2, 0.08)' } : {});

export function ProductList() {
  return (
    <List
      filters={productFilters}
      filterDefaultValues={{ active: true }}
      sort={{ field: 'name', order: 'ASC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" rowSx={lowStockRowSx} bulkActionButtons={false}>
        <TextField source="sku" label="SKU" />
        <TextField source="name" />
        <ReferenceField source="categoryId" reference="categories" label="Category" link={false} />
        <QuantityField source="quantity" textAlign="right" />
        <QuantityField source="reorderLevel" label="Reorder level" textAlign="right" />
        <MoneyField source="unitCost" label="Unit cost" textAlign="right" />
        <MoneyField source="stockValue" label="Stock value" textAlign="right" />
        <StockStatusField label="Status" sortable={false} />
        <BooleanField source="active" />
      </Datagrid>
    </List>
  );
}
