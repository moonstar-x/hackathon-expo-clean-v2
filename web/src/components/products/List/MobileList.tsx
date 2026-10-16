import type { ReactElement } from 'react';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { InfiniteList, SimpleList } from 'react-admin';
import { PRODUCT_DEFAULT_FILTER, PRODUCT_PER_PAGE, PRODUCT_SORT } from '../../../constants/products';
import { listRowSx } from '../../../styles/list';
import { lowStockRowSx } from '../../../styles/products';
import type { Product } from '../../../types/api';
import MobileActions from './MobileActions';
import ProductPrimary from './ProductPrimary';
import ProductSecondary from './ProductSecondary';
import { productFilters } from './productFilters';

/** The products as cards that load more as you scroll; low-stock cards are tinted like the table rows. */
const MobileList = (): ReactElement => {
  const theme: Theme = useTheme();
  const rowSx = (record: Product): SxProps => lowStockRowSx(theme, record);
  return (
    <InfiniteList
      filters={productFilters(false)}
      filterDefaultValues={PRODUCT_DEFAULT_FILTER}
      sort={PRODUCT_SORT}
      perPage={PRODUCT_PER_PAGE}
      actions={<MobileActions />}
    >
      <SimpleList<Product>
        rowClick="show"
        primaryText={<ProductPrimary />}
        secondaryText={<ProductSecondary />}
        rowSx={rowSx}
        sx={listRowSx()}
      />
    </InfiniteList>
  );
};

export default MobileList;
