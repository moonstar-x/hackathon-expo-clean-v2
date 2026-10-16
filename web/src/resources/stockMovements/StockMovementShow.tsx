import { DateField, ListButton, ReferenceField, Show, SimpleShowLayout, TextField, TopToolbar } from 'react-admin';
import { MovementQuantityField, MovementTypeField } from '../../components/fields';

export function StockMovementShow() {
  return (
    <Show
      actions={
        <TopToolbar>
          <ListButton />
        </TopToolbar>
      }
    >
      <SimpleShowLayout>
        <TextField source="id" label="Movement #" />
        <DateField source="createdAt" label="Date" showTime />
        <ReferenceField source="productId" reference="products" label="Product" link="show" />
        <MovementTypeField label="Type" />
        <MovementQuantityField source="quantity" />
        <MovementQuantityField source="delta" signed />
        <MovementQuantityField source="balanceAfter" label="Balance after" />
        <TextField source="reason" emptyText="—" />
        <TextField source="reference" emptyText="—" />
        <TextField source="createdBy" label="Created by" />
      </SimpleShowLayout>
    </Show>
  );
}
