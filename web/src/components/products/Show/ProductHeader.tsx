import type { ReactElement } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { EditButton, ListButton, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { Product } from '../../../types/api';
import OutlinedBadge from '../../list/OutlinedBadge';
import PageHeader from '../../PageHeader';
import MovementButton from '../../stock-movements/MovementButton';

/** The product page's heading: SKU over the name, "Inactivo" when archived, then what can be done with it. */
const ProductHeader = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <PageHeader
      eyebrow={translate('app.products.eyebrow', { sku: record.sku })}
      title={record.name}
      badge={record.active ? null : <OutlinedBadge label={translate('app.products.inactive')} />}
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
