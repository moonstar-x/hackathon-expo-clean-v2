import type { ReactElement } from 'react';
import { SimpleList } from 'react-admin';
import { listRowSx } from '../../../../styles/list';
import type { StockMovement } from '../../../../types/api';
import MovementSecondary from '../../../stock-movements/MovementSecondary';
import EmptyState from '../../../list/EmptyState';
import HistoryPrimary from './HistoryPrimary';

/** The history as cards: when, with the type badge, then the change, what was left and why. */
const MobileList = (): ReactElement => (
  <SimpleList<StockMovement>
    rowClick="show"
    primaryText={<HistoryPrimary />}
    secondaryText={<MovementSecondary />}
    empty={<EmptyState variant="compact" messages="app.empty.history" action={false} />}
    sx={listRowSx()}
  />
);

export default MobileList;
