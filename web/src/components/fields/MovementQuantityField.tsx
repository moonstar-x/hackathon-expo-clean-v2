import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useFieldValue, useRecordContext } from 'react-admin';
import { DELTA_COLOR } from '../../constants/stockMovements';
import useProductUnit from '../../hooks/useProductUnit';
import type { StockMovement, Unit } from '../../types/api';
import type { MovementQuantityFieldProps } from '../../types/fields';
import { deltaTone, formatDelta, formatQuantity } from '../../utils/format';

/** A movement quantity with its product's unit; `signed` shows a delta: +10 green, −3 red, 0 grey. */
const MovementQuantityField = ({ signed = false, ...props }: MovementQuantityFieldProps): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext(props) as StockMovement | undefined;
  const value: unknown = useFieldValue(props);
  const unit: Unit | undefined = useProductUnit(record?.productId);
  if (typeof value !== 'number') return null;
  if (!signed) {
    return (
      <Typography component="span" variant="body2">
        {formatQuantity(value, unit)}
      </Typography>
    );
  }
  const tone: ReturnType<typeof deltaTone> = deltaTone(value);
  return (
    <Typography
      component="span"
      variant="body2"
      sx={{ color: DELTA_COLOR[tone], fontWeight: tone === 'zero' ? undefined : 600, whiteSpace: 'nowrap' }}
    >
      {formatDelta(value, unit)}
    </Typography>
  );
};

export default MovementQuantityField;
