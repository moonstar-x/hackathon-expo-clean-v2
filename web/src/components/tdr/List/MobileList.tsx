import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { TDR_EMPTY_STEPS, TDR_PER_PAGE, TDR_SORT } from '../../../constants/tdr';
import { listRowSx } from '../../../styles/list';
import type { TdrDocument } from '../../../types/tdr';
import { tdrName, tdrRefetchInterval } from '../../../utils/tdr';
import EmptyState from '../../list/EmptyState';
import PrimaryRow from '../../list/PrimaryRow';
import TdrStatusBadge from '../TdrStatusBadge';
import MobileActions from './MobileActions';
import TdrSecondary from './TdrSecondary';
import { tdrFilters } from './tdrFilters';

/** The documents as cards that load more as you scroll, each with its state top-right. */
const MobileList = (): ReactElement => (
  <InfiniteList
    filters={tdrFilters}
    sort={TDR_SORT}
    perPage={TDR_PER_PAGE}
    actions={<MobileActions />}
    empty={<EmptyState variant="page" steps={TDR_EMPTY_STEPS} />}
    queryOptions={{ refetchInterval: tdrRefetchInterval }}
  >
    <SimpleList<TdrDocument>
      rowClick="edit"
      primaryText={(doc: TdrDocument): ReactElement => <PrimaryRow end={<TdrStatusBadge status={doc.status} dense />}>{tdrName(doc)}</PrimaryRow>}
      secondaryText={<TdrSecondary />}
      empty={<EmptyState />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
