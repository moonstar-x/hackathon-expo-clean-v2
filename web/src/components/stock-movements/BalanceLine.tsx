import type { ReactElement } from 'react';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useProductUnit from '../../hooks/useProductUnit';
import type { StockMovement, Unit } from '../../types/api';
import { formatQuantity } from '../../utils/format';

/** "Quedan 12 cajas": the stock left after a movement, in its product's unit. */
const BalanceLine = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  const translate: TranslateFunction = useTranslate();
  const unit: Unit | undefined = useProductUnit(record?.productId);
  if (!record) return null;
  return (
    <>
      {translate('app.stockMovements.balanceLine', {
        smart_count: record.balanceAfter,
        quantity: formatQuantity(record.balanceAfter, unit),
      })}
    </>
  );
};

export default BalanceLine;
