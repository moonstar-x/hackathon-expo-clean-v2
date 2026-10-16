import type { ReactElement } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ListButton, ShowButton, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { StockMovement } from '../../../types/api';
import { formatDateTime } from '../../../utils/dates';
import PageHeader from '../../PageHeader';

/** The movement page's heading: when it happened over its number, and the way to its product. Its type is on the summary's ribbon. */
const MovementHeader = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <PageHeader
      eyebrow={formatDateTime(record.createdAt)}
      title={translate('app.stockMovements.title', { id: record.id })}
      actions={
        <>
          <ListButton label="ra.action.back" icon={<ArrowBackIcon />} />
          <ShowButton
            resource="products"
            record={{ id: record.productId }}
            label="app.stockMovements.openProduct"
            variant="outlined"
          />
        </>
      }
    />
  );
};

export default MovementHeader;
