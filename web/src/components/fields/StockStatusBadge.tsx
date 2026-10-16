import type { ReactElement } from 'react';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { STOCK_STATUS_TONE } from '../../constants/components';
import type { Product, StockStatus } from '../../types/api';
import type { BadgeProps } from '../../types/fields';
import { stockStatus } from '../../utils/products';
import OutlinedBadge from '../list/OutlinedBadge';

/** "Sin existencias" (red) or "Existencias bajas" (orange); nothing while stock is above its reorder level. */
const StockStatusBadge = ({ dense, ...props }: BadgeProps): ReactElement | null => {
  const record: Product | undefined = useRecordContext(props) as Product | undefined;
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  const status: StockStatus = stockStatus(record);
  if (status === 'inStock') return null;
  return (
    <OutlinedBadge label={translate(`app.products.status.${status}`)} tone={STOCK_STATUS_TONE[status]} dense={dense} />
  );
};

export default StockStatusBadge;
