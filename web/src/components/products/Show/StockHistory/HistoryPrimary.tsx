import type { ReactElement } from 'react';
import { useRecordContext } from 'react-admin';
import type { StockMovement } from '../../../../types/api';
import { formatDateTime } from '../../../../utils/dates';
import MovementTypeBadge from '../../../fields/MovementTypeBadge';
import PrimaryRow from '../../../list/PrimaryRow';

/** History row title: when the movement happened, with its type badge top-right. */
const HistoryPrimary = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  if (!record) return null;
  return <PrimaryRow end={<MovementTypeBadge dense />}>{formatDateTime(record.createdAt)}</PrimaryRow>;
};

export default HistoryPrimary;
