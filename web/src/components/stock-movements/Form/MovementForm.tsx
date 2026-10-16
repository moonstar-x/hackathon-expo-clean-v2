import type { ReactElement } from 'react';
import {
  AutocompleteInput,
  maxLength,
  RadioButtonGroupInput,
  ReferenceInput,
  required,
  SimpleForm,
  TextInput,
} from 'react-admin';
import { PRODUCT_SORT } from '../../../constants/products';
import { MOVEMENT_TYPE_CHOICES } from '../../../constants/stockMovements';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import CurrentStock from './CurrentStock';
import QuantityInput from './QuantityInput';

/** Only active products take new movements. */
const ACTIVE_PRODUCTS: Record<string, unknown> = { active: true };

const DEFAULT_VALUES: Record<string, unknown> = { type: 'IN' };

/**
 * A new stock movement: which product, what happened to it, and how much. Opened from a product's
 * page, it arrives with the product and type already filled in.
 */
const MovementForm = (): ReactElement => (
  <SimpleForm defaultValues={DEFAULT_VALUES} toolbar={<FormToolbar />}>
    <ReferenceInput source="productId" reference="products" filter={ACTIVE_PRODUCTS} sort={PRODUCT_SORT}>
      <AutocompleteInput validate={required()} fullWidth />
    </ReferenceInput>
    <CurrentStock />
    <RadioButtonGroupInput source="type" choices={MOVEMENT_TYPE_CHOICES} validate={required()} />
    <QuantityInput />
    <TextInput
      source="reason"
      validate={maxLength(255)}
      parse={emptyToNull}
      helperText="app.stockMovements.help.reason"
      fullWidth
    />
    <TextInput
      source="reference"
      validate={maxLength(100)}
      parse={emptyToNull}
      helperText="app.stockMovements.help.reference"
      fullWidth
    />
  </SimpleForm>
);

export default MovementForm;
