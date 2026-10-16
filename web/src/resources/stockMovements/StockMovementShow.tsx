import { DateField, ListButton, ReferenceField, Show, SimpleShowLayout, TextField, TopToolbar } from 'react-admin';
import { MovementQuantityField, MovementReasonField, MovementTypeField } from '../../components/fields';

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
        <TextField source="id" label="Movimiento n.º" />
        <DateField source="createdAt" label="Fecha" showTime />
        <ReferenceField source="productId" reference="products" label="Producto" link="show" />
        <MovementTypeField label="Tipo" />
        <MovementQuantityField source="quantity" />
        <MovementQuantityField source="delta" signed />
        <MovementQuantityField source="balanceAfter" label="Existencias resultantes" />
        <MovementReasonField source="reason" />
        <TextField source="reference" emptyText="—" />
        <TextField source="createdBy" label="Registrado por" />
      </SimpleShowLayout>
    </Show>
  );
}
