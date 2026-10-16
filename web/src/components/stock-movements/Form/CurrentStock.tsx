import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useWatch } from 'react-hook-form';
import { useGetOne, useTranslate, type TranslateFunction, type UseGetOneHookValue } from 'react-admin';
import { currentStockSx } from '../../../styles/pages';
import type { Product } from '../../../types/api';
import { formatQuantity } from '../../../utils/format';

/** Under the product input: how much is on hand now, and the level at which to reorder. */
const CurrentStock = (): ReactElement | null => {
  const translate: TranslateFunction = useTranslate();
  const productId: number | undefined = useWatch({ name: 'productId' }) as number | undefined;
  const { data: product }: UseGetOneHookValue<Product> = useGetOne<Product>(
    'products',
    { id: productId ?? 0 },
    { enabled: productId !== undefined && productId !== null },
  );
  if (productId === undefined || productId === null) return null;
  return (
    <Typography variant="body2" sx={currentStockSx}>
      {product
        ? translate('app.stockMovements.currentStock', {
            quantity: formatQuantity(product.quantity, product.unit),
            reorder: formatQuantity(product.reorderLevel, product.unit),
          })
        : translate('app.stockMovements.currentStockLoading')}
    </Typography>
  );
};

export default CurrentStock;
