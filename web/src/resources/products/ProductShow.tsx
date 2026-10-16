import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import {
  BooleanField,
  Datagrid,
  DateField,
  EditButton,
  Pagination,
  ReferenceField,
  ReferenceManyField,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
  UrlField,
  useRecordContext,
  WithRecord,
} from 'react-admin';
import { MoneyField, MovementQuantityField, MovementReasonField, MovementTypeField, QuantityField, StockStatusField } from '../../components/fields';
import { MovementButton } from '../../components/MovementButton';
import type { Product } from '../../types';

function ProductShowActions() {
  const record = useRecordContext<Product>();
  return (
    <TopToolbar>
      {record && (
        <>
          <MovementButton productId={record.id} type="IN" />
          <MovementButton productId={record.id} type="OUT" />
          <MovementButton productId={record.id} type="ADJUSTMENT" />
        </>
      )}
      <EditButton />
    </TopToolbar>
  );
}

export function ProductShow() {
  return (
    <Show actions={<ProductShowActions />}>
      <SimpleShowLayout>
        <TextField source="sku" label="SKU" />
        <TextField source="name" />
        <TextField source="description" emptyText="—" />
        <ReferenceField source="categoryId" reference="categories" label="Categoría" />
        <ReferenceField source="supplierId" reference="suppliers" label="Proveedor" emptyText="—" />
        <QuantityField source="quantity" label="Existencias actuales" />
        <StockStatusField label="Estado" />
        <QuantityField source="reorderLevel" label="Nivel de reposición" />
        <MoneyField source="unitCost" label="Costo unitario" />
        <MoneyField source="stockValue" label="Valor del inventario" />
        <TextField source="location" emptyText="—" />
        <BooleanField source="hazardous" />
        <WithRecord
          label="URL de la ficha de seguridad"
          render={(record: Product) =>
            record.sdsUrl ? (
              <UrlField source="sdsUrl" target="_blank" rel="noopener noreferrer" />
            ) : (
              <Typography variant="body2">—</Typography>
            )
          }
        />
        <BooleanField source="active" />
        <DateField source="createdAt" label="Fecha de creación" showTime />
        <DateField source="updatedAt" label="Última actualización" showTime />
      </SimpleShowLayout>

      <Divider />
      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>
        Historial de inventario
      </Typography>
      <ReferenceManyField
        reference="stock-movements"
        target="productId"
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={10}
        pagination={<Pagination rowsPerPageOptions={[10, 25, 50]} />}
      >
        <Datagrid bulkActionButtons={false} rowClick="show" empty={<Typography sx={{ p: 2 }}>Todavía no hay movimientos.</Typography>}>
          <DateField source="createdAt" label="Fecha" showTime />
          <MovementTypeField label="Tipo" />
          <MovementQuantityField source="quantity" textAlign="right" />
          <MovementQuantityField source="delta" signed textAlign="right" />
          <MovementQuantityField source="balanceAfter" label="Existencias resultantes" textAlign="right" />
          <MovementReasonField source="reason" />
          <TextField source="reference" emptyText="—" />
          <TextField source="createdBy" label="Registrado por" />
        </Datagrid>
      </ReferenceManyField>
    </Show>
  );
}
