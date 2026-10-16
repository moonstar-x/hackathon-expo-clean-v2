import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import { detailStackSx } from '../../../styles/pages';
import { ribbonGutterSx } from '../../../styles/ribbon';
import { mergeSx } from '../../../styles/sx';
import DetailsCard from './DetailsCard';
import StockHistory from './StockHistory';
import SummaryCard from './SummaryCard';

/** The product page under its heading: stock at a glance, what the product is, and its movements. */
const ProductDetail = (): ReactElement => (
  <Stack spacing={2} sx={mergeSx(ribbonGutterSx, detailStackSx)}>
    <SummaryCard />
    <DetailsCard />
    <StockHistory />
  </Stack>
);

export default ProductDetail;
