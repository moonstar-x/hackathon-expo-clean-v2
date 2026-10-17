import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import { NONE } from '../../../constants/components';
import { listRowSx } from '../../../styles/list';
import type { Category } from '../../../types/api';
import EmptyState from '../../list/EmptyState';
import PrimaryRow from '../../list/PrimaryRow';
import MobileActions from './MobileActions';
import { categoryFilters } from './categoryFilters';

/** The categories as cards that load more as you scroll; a card opens its edit form. */
const MobileList = (): ReactElement => (
  <InfiniteList filters={categoryFilters} sort={CATALOG_SORT} actions={<MobileActions />} empty={<EmptyState variant="page" />}>
    <SimpleList<Category>
      rowClick="edit"
      primaryText={(record: Category): ReactElement => <PrimaryRow>{record.name}</PrimaryRow>}
      secondaryText={(record: Category): string => record.description ?? NONE}
      empty={<EmptyState />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
