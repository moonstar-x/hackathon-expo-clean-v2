import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import { detailPageSx } from '../../../styles/pages';
import DetailsSection from './DetailsSection';
import RecordSection from './RecordSection';
import StockHistory from './StockHistory';
import StockSection from './StockSection';

/**
 * The product page under its heading, across the whole page: the stock against its reorder line,
 * what the product is beside its record, then its movements.
 */
const ProductDetail = (): ReactElement => (
  <Grid container spacing={2} sx={detailPageSx}>
    <Grid size={12}>
      <StockSection />
    </Grid>
    <Grid size={{ xs: 12, lg: 8 }}>
      <DetailsSection />
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <RecordSection />
    </Grid>
    <Grid size={12}>
      <StockHistory />
    </Grid>
  </Grid>
);

export default ProductDetail;
