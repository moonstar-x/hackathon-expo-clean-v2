import type { ReactElement } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { EditButton, ListButton, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { STOCK_STATUS_TONE } from '../../../constants/components';
import type { Product, StockStatus } from '../../../types/api';
import { stockStatus } from '../../../utils/products';
import OutlinedBadge from '../../list/OutlinedBadge';
import PageHeader from '../../PageHeader';
import MovementButton from '../../stock-movements/MovementButton';

/**
 * The product page's heading: SKU over the name, with its stock status ("Existencias bajas") and
 * "Inactivo" when archived as the badges the lists use, then what can be done with it.
 */
const ProductHeader = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  const status: StockStatus = stockStatus(record);
  return (
    <PageHeader
      eyebrow={translate('app.products.eyebrow', { sku: record.sku })}
      title={record.name}
      badge={
        <>
          <OutlinedBadge label={translate(`app.products.status.${status}`)} tone={STOCK_STATUS_TONE[status]} />
          {record.active ? null : <OutlinedBadge label={translate('app.products.inactive')} />}
        </>
      }
      actions={
        <>
          <ListButton label="ra.action.back" icon={<ArrowBackIcon />} />
          <MovementButton productId={record.id} type="IN" variant="contained" />
          <MovementButton productId={record.id} type="OUT" variant="outlined" />
          <MovementButton productId={record.id} type="ADJUSTMENT" variant="outlined" />
          <EditButton variant="outlined" />
        </>
      }
    />
  );
};

export default ProductHeader;
