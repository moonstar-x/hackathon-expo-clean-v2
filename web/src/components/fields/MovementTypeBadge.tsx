import type { ReactElement } from 'react';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { MOVEMENT_TYPE_TONE } from '../../constants/components';
import type { StockMovement } from '../../types/api';
import type { BadgeProps } from '../../types/fields';
import OutlinedBadge from '../list/OutlinedBadge';

/** The movement type as a badge: Entrada green, Salida red, Ajuste blue. */
const MovementTypeBadge = ({ dense, ...props }: BadgeProps): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext(props) as StockMovement | undefined;
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <OutlinedBadge
      label={translate(`app.stockMovements.types.${record.type}`)}
      tone={MOVEMENT_TYPE_TONE[record.type]}
      dense={dense}
    />
  );
};

export default MovementTypeBadge;
