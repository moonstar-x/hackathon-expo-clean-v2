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
  <SearchInput key="q" source="q" alwaysOn placeholder="Buscar por SKU, nombre o descripción" />,
  <ReferenceInput key="categoryId" source="categoryId" reference="categories" sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput label="Categoría" optionText="name" />
  </ReferenceInput>,
  <ReferenceInput key="supplierId" source="supplierId" reference="suppliers" sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput label="Proveedor" optionText="name" />
  </ReferenceInput>,
  <NullableBooleanInput key="active" source="active" label="Activo" />,
  <NullableBooleanInput key="hazardous" source="hazardous" label="Peligroso" />,
  <BooleanInput key="lowStock" source="lowStock" label="Solo existencias bajas" alwaysOn parse={trueOrRemove} />,
  <BooleanInput key="outOfStock" source="outOfStock" label="Solo sin existencias" parse={trueOrRemove} />,
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
        <ReferenceField source="categoryId" reference="categories" label="Categoría" link={false} />
        <QuantityField source="quantity" textAlign="right" />
        <QuantityField source="reorderLevel" label="Nivel de reposición" textAlign="right" />
        <MoneyField source="unitCost" label="Costo unitario" textAlign="right" />
        <MoneyField source="stockValue" label="Valor del inventario" textAlign="right" />
        <StockStatusField label="Estado" sortable={false} />
        <BooleanField source="active" />
      </Datagrid>
    </List>
  );
}
