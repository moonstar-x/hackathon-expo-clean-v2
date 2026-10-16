import type { ReactElement } from 'react';
import { Show } from 'react-admin';
import MovementDetail from '../../components/stock-movements/Show/MovementDetail';
import MovementHeader from '../../components/stock-movements/Show/MovementHeader';

// A plain <div> instead of react-admin's card: the detail is a column of cards of its own.
const StockMovementShow = (): ReactElement => (
  <Show actions={<MovementHeader />} component="div" emptyWhileLoading>
    <MovementDetail />
  </Show>
);

export default StockMovementShow;
