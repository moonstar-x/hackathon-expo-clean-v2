import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../../AppConfigContext';
import { STOCK_STATUS_RIBBON } from '../../../constants/components';
import { ribbonContentSx } from '../../../styles/pages';
import { ribbonCardSx } from '../../../styles/ribbon';
import type { Product, StockStatus } from '../../../types/api';
import { formatCurrency, formatQuantity } from '../../../utils/format';
import { stockStatus } from '../../../utils/products';
import StatBar from '../../list/StatBar';
import Ribbon from '../../Ribbon';

/** Where the stock stands, on the ribbon, and the four numbers behind it. */
const SummaryCard = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  const translate: TranslateFunction = useTranslate();
  const { currency } = useAppConfig();
  if (!record) return null;
  const status: StockStatus = stockStatus(record);
  return (
    <Card sx={ribbonCardSx}>
      <Ribbon color={STOCK_STATUS_RIBBON[status]}>{translate(`app.products.status.${status}`)}</Ribbon>
      <CardContent sx={ribbonContentSx}>
        <StatBar
          items={[
            { label: translate('app.products.currentStock'), value: formatQuantity(record.quantity, record.unit) },
            {
              label: translate('resources.products.fields.reorderLevel'),
              value: formatQuantity(record.reorderLevel, record.unit),
            },
            { label: translate('resources.products.fields.unitCost'), value: formatCurrency(record.unitCost, currency) },
            {
              label: translate('resources.products.fields.stockValue'),
              value: formatCurrency(record.stockValue, currency),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
