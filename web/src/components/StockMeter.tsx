import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { STOCK_STATUS_COLOR } from '../constants/components';
import {
  stockMeterFillSx,
  stockMeterLegendSx,
  stockMeterLegendTickSx,
  stockMeterSx,
  stockMeterTickSx,
  stockMeterTrackSx,
} from '../styles/products';
import type { StockStatus } from '../types/api';
import type { StatusColor } from '../types/components';
import type { StockMeterProps } from '../types/products';
import { formatQuantity } from '../utils/format';
import { meterScale, stockStatus } from '../utils/products';

/**
 * How much stock is left against the product's reorder line. The fill takes the status colour (green,
 * orange at the line or below, red at zero) and the line is a tick on the track. `medium` names the
 * line under the bar; `small` is for rows that print the numbers beside it.
 */
const StockMeter = ({ quantity, reorderLevel, unit, size = 'medium', label }: StockMeterProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const status: StockStatus = stockStatus({ quantity, isLowStock: quantity <= reorderLevel });
  const color: StatusColor = STOCK_STATUS_COLOR[status];
  const max: number = meterScale(quantity, reorderLevel);
  const reorder: string = formatQuantity(reorderLevel, unit);
  return (
    <Box sx={stockMeterSx}>
      <Box
        role="meter"
        aria-label={label ?? translate('app.products.currentStock')}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={quantity}
        aria-valuetext={translate('app.products.meter', { quantity: formatQuantity(quantity, unit), reorder })}
        sx={stockMeterTrackSx(color, size)}
      >
        <Box sx={stockMeterFillSx(color, quantity / max)} />
        <Box sx={stockMeterTickSx(reorderLevel / max)} />
      </Box>
      {size === 'medium' ? (
        <Typography variant="caption" component="p" sx={stockMeterLegendSx}>
          <Box component="span" aria-hidden sx={stockMeterLegendTickSx} />
          {translate('app.products.reorderLine', { reorder })}
        </Typography>
      ) : null}
    </Box>
  );
};

export default StockMeter;
