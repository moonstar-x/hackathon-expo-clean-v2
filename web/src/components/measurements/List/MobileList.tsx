import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { MEASUREMENT_EMPTY_STEPS, MEASUREMENT_PER_PAGE, MEASUREMENT_SORT } from '../../../constants/measurements';
import { listRowSx } from '../../../styles/list';
import { thumbnailRowSx } from '../../../styles/measurements';
import { mergeSx } from '../../../styles/sx';
import type { Measurement } from '../../../types/api';
import EmptyState from '../../list/EmptyState';
import PrimaryRow from '../../list/PrimaryRow';
import MeasurementThumbnail from '../MeasurementThumbnail';
import MeasurementSecondary from './MeasurementSecondary';
import MobileActions from './MobileActions';
import { measurementFilters } from './measurementFilters';

/**
 * The measurements as cards that load more as you scroll, each led by its plan's thumbnail. The
 * thumbnail goes in `leftIcon`: `leftAvatar` would crop it into a circle.
 */
const MobileList = (): ReactElement => (
  <InfiniteList
    filters={measurementFilters}
    sort={MEASUREMENT_SORT}
    perPage={MEASUREMENT_PER_PAGE}
    actions={<MobileActions />}
    empty={<EmptyState variant="page" steps={MEASUREMENT_EMPTY_STEPS} />}
  >
    <SimpleList<Measurement>
      rowClick="show"
      leftIcon={(): ReactElement => <MeasurementThumbnail />}
      primaryText={(record: Measurement): ReactElement => <PrimaryRow>{record.name}</PrimaryRow>}
      secondaryText={<MeasurementSecondary />}
      empty={<EmptyState />}
      sx={mergeSx(listRowSx(), thumbnailRowSx)}
    />
  </InfiniteList>
);

export default MobileList;
