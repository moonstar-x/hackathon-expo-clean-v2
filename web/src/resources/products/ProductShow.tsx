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
import { MoneyField, MovementQuantityField, MovementTypeField, QuantityField, StockStatusField } from '../../components/fields';
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
        <ReferenceField source="categoryId" reference="categories" label="Category" />
        <ReferenceField source="supplierId" reference="suppliers" label="Supplier" emptyText="—" />
        <QuantityField source="quantity" label="Quantity on hand" />
        <StockStatusField label="Status" />
        <QuantityField source="reorderLevel" label="Reorder level" />
        <MoneyField source="unitCost" label="Unit cost" />
        <MoneyField source="stockValue" label="Stock value" />
        <TextField source="location" emptyText="—" />
        <BooleanField source="hazardous" />
        <WithRecord
          label="SDS URL"
          render={(record: Product) =>
            record.sdsUrl ? (
              <UrlField source="sdsUrl" target="_blank" rel="noopener noreferrer" />
            ) : (
              <Typography variant="body2">—</Typography>
            )
          }
        />
        <BooleanField source="active" />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />
      </SimpleShowLayout>

      <Divider />
      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>
        Stock history
      </Typography>
      <ReferenceManyField
        reference="stock-movements"
        target="productId"
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={10}
        pagination={<Pagination rowsPerPageOptions={[10, 25, 50]} />}
      >
        <Datagrid bulkActionButtons={false} rowClick="show" empty={<Typography sx={{ p: 2 }}>No movements yet.</Typography>}>
          <DateField source="createdAt" label="Date" showTime />
          <MovementTypeField label="Type" />
          <MovementQuantityField source="quantity" textAlign="right" />
          <MovementQuantityField source="delta" signed textAlign="right" />
          <MovementQuantityField source="balanceAfter" label="Balance after" textAlign="right" />
          <TextField source="reason" emptyText="—" />
          <TextField source="reference" emptyText="—" />
          <TextField source="createdBy" label="By" />
        </Datagrid>
      </ReferenceManyField>
    </Show>
  );
}
