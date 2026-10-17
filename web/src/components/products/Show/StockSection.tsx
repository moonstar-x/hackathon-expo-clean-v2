import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../../AppConfigContext';
import { keyFigureLabelSx } from '../../../styles/pages';
import { stockFigureSx, stockSummarySx } from '../../../styles/products';
import type { Product } from '../../../types/api';
import { formatCurrency, formatQuantity } from '../../../utils/format';
import KeyFigures from '../../KeyFigures';
import ShowSection from '../../show/ShowSection';
import StockMeter from '../../StockMeter';

/** What the product page is opened for: the stock on hand against its reorder line, and the numbers behind it. */
const StockSection = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  const translate: TranslateFunction = useTranslate();
  const { currency } = useAppConfig();
  if (!record) return null;
  return (
    <ShowSection title={translate('app.products.sections.stock')}>
      <Box sx={stockSummarySx}>
        <div>
          <Typography component="p" sx={keyFigureLabelSx}>
            {translate('app.products.currentStock')}
          </Typography>
          <Typography component="p" sx={stockFigureSx}>
            {formatQuantity(record.quantity, record.unit)}
          </Typography>
          <StockMeter quantity={record.quantity} reorderLevel={record.reorderLevel} unit={record.unit} />
        </div>
        <KeyFigures
          items={[
            {
              label: translate('resources.products.fields.reorderLevel'),
              value: formatQuantity(record.reorderLevel, record.unit),
            },
            { label: translate('resources.products.fields.unitCost'), value: formatCurrency(record.unitCost, currency) },
            {
              label: translate('resources.products.fields.stockValue'),
              value: formatCurrency(record.stockValue, currency),
              hint: translate('app.products.stockValueHint'),
            },
          ]}
        />
      </Box>
    </ShowSection>
  );
};

export default StockSection;
