import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { MOVEMENT_PER_PAGE, MOVEMENT_SORT } from '../../../constants/stockMovements';
import { listRowSx } from '../../../styles/list';
import type { StockMovement } from '../../../types/api';
import EmptyState from '../../list/EmptyState';
import MovementSecondary from '../MovementSecondary';
import MobileActions from './MobileActions';
import MovementPrimary from './MovementPrimary';
import { movementFilters } from './movementFilters';

/** The movements as cards that load more as you scroll. */
const MobileList = (): ReactElement => (
  <InfiniteList
    filters={movementFilters}
    sort={MOVEMENT_SORT}
    perPage={MOVEMENT_PER_PAGE}
    actions={<MobileActions />}
    empty={<EmptyState variant="page" />}
  >
    <SimpleList<StockMovement>
      rowClick="show"
      primaryText={<MovementPrimary />}
      secondaryText={<MovementSecondary withDate />}
      empty={<EmptyState />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
