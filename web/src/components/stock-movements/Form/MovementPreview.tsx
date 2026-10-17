import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useWatch } from 'react-hook-form';
import { useGetOne, useTranslate, type TranslateFunction, type UseGetOneHookValue } from 'react-admin';
import { keyFigureLabelSx } from '../../../styles/pages';
import { movementPreviewSx, previewFigureSx, previewLineSx } from '../../../styles/products';
import type { MovementType, Product } from '../../../types/api';
import { formatQuantity } from '../../../utils/format';
import { stockAfter } from '../../../utils/products';
import StockMeter from '../../StockMeter';

/**
 * Beside the movement form: the chosen product's stock now and what this movement will leave, each
 * against the reorder line, so a wrong quantity shows before it is saved. A salida that would take
 * more than there is warns in the API's own words; the API still has the final say.
 */
const MovementPreview = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const productId: number | null | undefined = useWatch({ name: 'productId' }) as number | null | undefined;
  const type: MovementType = (useWatch({ name: 'type' }) as MovementType | undefined) ?? 'IN';
  const amount: unknown = useWatch({ name: 'quantity' });
  const hasProduct: boolean = productId !== undefined && productId !== null;
  const { data: product }: UseGetOneHookValue<Product> = useGetOne<Product>(
    'products',
    { id: productId ?? 0 },
    { enabled: hasProduct },
  );
  const after: number | null =
    product && typeof amount === 'number' && Number.isFinite(amount) ? stockAfter(product.quantity, type, amount) : null;

  return (
    <Box component="aside" aria-label={translate('app.stockMovements.preview.title')} sx={movementPreviewSx}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
        {translate('app.stockMovements.preview.title')}
      </Typography>
      {!product ? (
        <Typography variant="body2" color="text.secondary">
          {translate(hasProduct ? 'app.stockMovements.preview.loading' : 'app.stockMovements.preview.pick')}
        </Typography>
      ) : (
        <>
          <Box sx={previewLineSx}>
            <Typography component="p" sx={keyFigureLabelSx}>
              {translate('app.stockMovements.preview.now')}
            </Typography>
            <Typography component="p" sx={previewFigureSx}>
              {formatQuantity(product.quantity, product.unit)}
            </Typography>
            <StockMeter quantity={product.quantity} reorderLevel={product.reorderLevel} unit={product.unit} />
          </Box>
          {after === null ? (
            <Typography variant="body2" color="text.secondary">
              {translate('app.stockMovements.preview.enterQuantity')}
            </Typography>
          ) : after < 0 ? (
            <Alert severity="error">{translate('app.stockMovements.preview.insufficient')}</Alert>
          ) : (
            <Box sx={previewLineSx}>
              <Typography component="p" sx={keyFigureLabelSx}>
                {translate('app.stockMovements.preview.after')}
              </Typography>
              <Typography component="p" sx={previewFigureSx}>
                {formatQuantity(after, product.unit)}
              </Typography>
              <StockMeter
                quantity={after}
                reorderLevel={product.reorderLevel}
                unit={product.unit}
                label={translate('app.stockMovements.preview.after')}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default MovementPreview;
