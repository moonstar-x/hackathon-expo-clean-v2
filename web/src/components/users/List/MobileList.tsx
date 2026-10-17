import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { USER_SORT } from '../../../constants/users';
import { listRowSx } from '../../../styles/list';
import type { User } from '../../../types/api';
import EmptyState from '../../list/EmptyState';
import MobileActions from './MobileActions';
import UserPrimary from './UserPrimary';
import UserSecondary from './UserSecondary';
import { userFilters } from './userFilters';

/** The users as cards that load more as you scroll; a card opens its edit form. */
const MobileList = (): ReactElement => (
  <InfiniteList filters={userFilters} sort={USER_SORT} actions={<MobileActions />} empty={<EmptyState variant="page" />}>
    <SimpleList<User>
      rowClick="edit"
      primaryText={<UserPrimary />}
      secondaryText={<UserSecondary />}
      empty={<EmptyState />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
