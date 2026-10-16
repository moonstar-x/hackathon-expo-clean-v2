import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import {
  AutocompleteInput,
  Create,
  maxLength,
  minValue,
  NumberInput,
  RadioButtonGroupInput,
  ReferenceInput,
  required,
  SimpleForm,
  TextInput,
  useGetOne,
  useNotify,
  useRedirect,
} from 'react-admin';
import { emptyToNull, maxDecimals } from '../../components/validators';
import type { MovementType, Product, StockMovement } from '../../types';
import { formatQuantity } from '../../utils/format';
import { MOVEMENT_TYPE_CHOICES, QUANTITY_LABELS } from './choices';

const validateQuantity = [required(), minValue(0), maxDecimals(3)];

/** Positive for IN/OUT; the server reports the same rule if this is bypassed. */
const positiveUnlessAdjustment = (value: unknown, values: { type?: MovementType }) =>
  values.type !== 'ADJUSTMENT' && typeof value === 'number' && value <= 0 ? 'Must be greater than 0' : undefined;

function CurrentStock() {
  const productId = useWatch({ name: 'productId' }) as number | undefined;
  const { data: product, isPending } = useGetOne<Product>('products', { id: productId! }, { enabled: !!productId });
  if (!productId) return null;
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: -1, mb: 2 }}>
      {isPending || !product
        ? 'Current stock: …'
        : `Current stock: ${formatQuantity(product.quantity, product.unit)} (reorder level ${formatQuantity(product.reorderLevel, product.unit)})`}
    </Typography>
  );
}

function QuantityInput() {
  const type = (useWatch({ name: 'type' }) as MovementType | undefined) ?? 'IN';
  const { label, helperText } = QUANTITY_LABELS[type];
  return (
    <NumberInput
      source="quantity"
      label={label}
      helperText={helperText}
      min={0}
      validate={[...validateQuantity, positiveUnlessAdjustment]}
    />
  );
}

export function StockMovementCreate() {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const redirect = useRedirect();

  const onSuccess = async (movement: StockMovement) => {
    // The product's quantity changed server-side; refetch anything cached about products and movements.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]);
    notify('Stock movement recorded', { type: 'success' });
    redirect('show', 'products', movement.productId);
  };

  return (
    <Create<StockMovement> title="Record stock movement" mutationOptions={{ onSuccess }}>
      <SimpleForm sx={{ maxWidth: 600 }} defaultValues={{ type: 'IN' }}>
        <ReferenceInput
          source="productId"
          reference="products"
          filter={{ active: true }}
          sort={{ field: 'name', order: 'ASC' }}
        >
          <AutocompleteInput label="Product" validate={required()} fullWidth />
        </ReferenceInput>
        <CurrentStock />
        <RadioButtonGroupInput source="type" choices={MOVEMENT_TYPE_CHOICES} validate={required()} />
        <QuantityInput />
        <TextInput
          source="reason"
          validate={maxLength(255)}
          parse={emptyToNull}
          helperText="e.g. Monthly restock, Used at Office Tower job"
          fullWidth
        />
        <TextInput
          source="reference"
          validate={maxLength(100)}
          parse={emptyToNull}
          helperText="e.g. PO or work-order number"
        />
      </SimpleForm>
    </Create>
  );
}
