import type { ReactElement } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ListButton, ShowButton, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { StockMovement } from '../../../types/api';
import { formatDateTime } from '../../../utils/dates';
import MovementTypeBadge from '../../fields/MovementTypeBadge';
import PageHeader from '../../PageHeader';

/** The movement page's heading: when it happened over its number and type, and the way to its product. */
const MovementHeader = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <PageHeader
      eyebrow={formatDateTime(record.createdAt)}
      title={translate('app.stockMovements.title', { id: record.id })}
      badge={<MovementTypeBadge />}
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
