import {
  AutocompleteInput,
  CreateButton,
  Datagrid,
  DateField,
  DateInput,
  ExportButton,
  List,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  SelectInput,
  TextField,
  TopToolbar,
  FilterButton,
} from 'react-admin';
import { MovementQuantityField, MovementTypeField } from '../../components/fields';
import { MOVEMENT_TYPE_CHOICES } from './choices';

const movementFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search reason, reference" />,
  <ReferenceInput key="productId" source="productId" reference="products" sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput label="Product" />
  </ReferenceInput>,
  <SelectInput key="type" source="type" choices={MOVEMENT_TYPE_CHOICES} />,
  <DateInput key="createdAt_gte" source="createdAt_gte" label="From date" />,
  <DateInput key="createdAt_lte" source="createdAt_lte" label="To date" />,
];

function MovementListActions() {
  return (
    <TopToolbar>
      <FilterButton />
      <CreateButton label="Record movement" />
      <ExportButton />
    </TopToolbar>
  );
}

export function StockMovementList() {
  return (
    <List
      filters={movementFilters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      actions={<MovementListActions />}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <DateField source="createdAt" label="Date" showTime />
        <ReferenceField source="productId" reference="products" label="Product" />
        <MovementTypeField label="Type" sortBy="type" />
        <MovementQuantityField source="quantity" textAlign="right" />
        <MovementQuantityField source="delta" signed textAlign="right" />
        <MovementQuantityField source="balanceAfter" label="Balance after" textAlign="right" sortable={false} />
        <TextField source="reason" emptyText="—" sortable={false} />
        <TextField source="reference" emptyText="—" sortable={false} />
        <TextField source="createdBy" label="Created by" sortable={false} />
      </Datagrid>
    </List>
  );
}
