import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';
import { useRecordContext } from 'react-admin';
import type { StockMovement } from '../../types/api';
import type { MovementSecondaryProps } from '../../types/fields';
import { formatDateTime } from '../../utils/dates';
import MovementQuantityField from '../fields/MovementQuantityField';
import MovementReasonField from '../fields/MovementReasonField';
import MetaRow from '../list/MetaRow';
import BalanceLine from './BalanceLine';

/** Mobile row details of a movement: when, the signed change, what is left, and why. */
const MovementSecondary = ({ withDate = false }: MovementSecondaryProps): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  if (!record) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      {withDate ? <MetaRow icon={ScheduleOutlined}>{formatDateTime(record.createdAt)}</MetaRow> : null}
      <MetaRow icon={SwapVertOutlined}>
        <MovementQuantityField source="delta" signed />
      </MetaRow>
      <MetaRow icon={Inventory2Outlined}>
        <BalanceLine />
      </MetaRow>
      {record.reason ? (
        <MetaRow icon={NotesOutlined}>
          <MovementReasonField source="reason" />
        </MetaRow>
      ) : null}
    </Stack>
  );
};

export default MovementSecondary;
