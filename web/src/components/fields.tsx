import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useFieldValue, useRecordContext, type FieldProps } from 'react-admin';
import { useAppConfig } from '../AppConfigContext';
import type { MovementType, Product, StockMovement } from '../types';
import { useProductUnit } from './useProductUnit';
import { deltaTone, formatCurrency, formatDelta, formatQuantity } from '../utils/format';

type NumberFieldProps = FieldProps & { source: string };
/** Fields that render the whole record rather than one source. */
type RecordFieldProps = Partial<FieldProps>;

/** A product quantity with the record's own unit: `12.5 L`. */
export function QuantityField(props: NumberFieldProps) {
  const record = useRecordContext(props) as Product | undefined;
  const value = useFieldValue(props) as number | undefined;
  return (
    <Typography component="span" variant="body2">
      {formatQuantity(value, record?.unit)}
    </Typography>
  );
}

/** A movement quantity with its product's unit. */
export function MovementQuantityField(props: NumberFieldProps & { signed?: boolean }) {
  const record = useRecordContext(props) as StockMovement | undefined;
  const value = useFieldValue(props) as number | undefined;
  const unit = useProductUnit(record?.productId);
  if (value == null) return null;
  if (!props.signed) {
    return (
      <Typography component="span" variant="body2">
        {formatQuantity(value, unit)}
      </Typography>
    );
  }
  const tone = deltaTone(value);
  const color = tone === 'positive' ? 'success.main' : tone === 'negative' ? 'error.main' : 'text.disabled';
  return (
    <Typography component="span" variant="body2" sx={{ color, fontWeight: tone === 'zero' ? undefined : 500 }}>
      {formatDelta(value, unit)}
    </Typography>
  );
}

/** Money in the configured currency. */
export function MoneyField(props: NumberFieldProps) {
  const { currency } = useAppConfig();
  const value = useFieldValue(props) as number | undefined;
  return (
    <Typography component="span" variant="body2">
      {formatCurrency(value, currency)}
    </Typography>
  );
}

/** "Out of stock" (red) or "Low stock" (orange) chip; nothing when stock is fine. */
export function StockStatusField(props: RecordFieldProps) {
  const record = useRecordContext(props) as Product | undefined;
  if (!record) return null;
  if (record.quantity === 0) return <Chip size="small" color="error" label="Out of stock" />;
  if (record.isLowStock) return <Chip size="small" color="warning" label="Low stock" />;
  return null;
}

const TYPE_CHIP: Record<MovementType, { label: string; color: 'success' | 'error' | 'info' }> = {
  IN: { label: 'IN', color: 'success' },
  OUT: { label: 'OUT', color: 'error' },
  ADJUSTMENT: { label: 'ADJUSTMENT', color: 'info' },
};

/** IN green, OUT red, ADJUSTMENT blue. */
export function MovementTypeField(props: RecordFieldProps) {
  const record = useRecordContext(props) as StockMovement | undefined;
  if (!record) return null;
  const chip = TYPE_CHIP[record.type];
  return <Chip size="small" variant="outlined" color={chip.color} label={chip.label} />;
}
