import type { ReactElement } from 'react';
import { useWatch } from 'react-hook-form';
import { minValue, NumberInput, required, type Validator } from 'react-admin';
import { QUANTITY_LABELS } from '../../../constants/stockMovements';
import type { MovementType } from '../../../types/api';
import type { QuantityLabel } from '../../../types/fields';
import { maxDecimals } from '../../../utils/validators';

/** Positive for IN/OUT; the server reports the same rule if this is bypassed. */
const positiveUnlessAdjustment = (value: unknown, values: { type?: MovementType }): string | undefined =>
  values.type !== 'ADJUSTMENT' && typeof value === 'number' && value <= 0
    ? 'app.stockMovements.validation.positive'
    : undefined;

const validateQuantity: Validator[] = [required(), minValue(0), maxDecimals(3), positiveUnlessAdjustment];

/** The quantity, labelled for what it means: received, consumed, or counted. */
const QuantityInput = (): ReactElement => {
  const type: MovementType = (useWatch({ name: 'type' }) as MovementType | undefined) ?? 'IN';
  const { label, helperText }: QuantityLabel = QUANTITY_LABELS[type];
  return <NumberInput source="quantity" label={label} helperText={helperText} min={0} validate={validateQuantity} fullWidth />;
};

export default QuantityInput;
