import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import { listRowSx } from '../../../styles/list';
import type { Supplier } from '../../../types/api';
import PrimaryRow from '../../list/PrimaryRow';
import MobileActions from './MobileActions';
import SupplierSecondary from './SupplierSecondary';
import { supplierFilters } from './supplierFilters';

/** The suppliers as cards that load more as you scroll; a card opens its edit form. */
const MobileList = (): ReactElement => (
  <InfiniteList filters={supplierFilters} sort={CATALOG_SORT} actions={<MobileActions />}>
    <SimpleList<Supplier>
      rowClick="edit"
      primaryText={(record: Supplier): ReactElement => <PrimaryRow>{record.name}</PrimaryRow>}
      secondaryText={<SupplierSecondary />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
