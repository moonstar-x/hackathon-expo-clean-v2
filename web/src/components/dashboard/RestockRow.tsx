import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import { Link, useTranslate, type TranslateFunction } from 'react-admin';
import { STOCK_STATUS_TONE } from '../../constants/components';
import { restockMainSx, restockMeterSx, restockRowSx, rowMetaSx, rowTitleLineSx, rowTitleSx } from '../../styles/dashboard';
import type { RestockRowProps } from '../../types/dashboard';
import { formatNumber, formatQuantity } from '../../utils/format';
import OutlinedBadge from '../list/OutlinedBadge';
import StockMeter from '../StockMeter';
import MovementButton from '../stock-movements/MovementButton';

/** A product to restock: its name and SKU, how far it is below its reorder line, and "Recibir". */
const RestockRow = ({ product }: RestockRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <ListItem divider sx={restockRowSx}>
      <Box sx={restockMainSx}>
        <Box sx={rowTitleLineSx}>
          <Link to={`/products/${product.id}/show`} sx={rowTitleSx}>
            {product.name}
          </Link>
          {product.quantity === 0 ? (
            <OutlinedBadge label={translate('app.products.status.outOfStock')} tone={STOCK_STATUS_TONE.outOfStock} dense />
          ) : null}
        </Box>
        <Typography component="p" sx={rowMetaSx}>
          {product.sku}
        </Typography>
      </Box>
      <Box sx={restockMeterSx}>
        <StockMeter quantity={product.quantity} reorderLevel={product.reorderLevel} unit={product.unit} size="small" />
        <Typography component="p" sx={rowMetaSx}>
          {translate('app.dashboard.quantityOfReorder', {
            quantity: formatQuantity(product.quantity, product.unit),
            reorder: formatNumber(product.reorderLevel),
          })}
        </Typography>
      </Box>
      <MovementButton productId={product.id} type="IN" label="app.dashboard.receive" />
    </ListItem>
  );
};

export default RestockRow;
