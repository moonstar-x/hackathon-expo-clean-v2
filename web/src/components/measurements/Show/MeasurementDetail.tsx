import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import { detailPageSx } from '../../../styles/pages';
import DetailsSection from './DetailsSection';
import MeasurementTabs from './MeasurementTabs';
import SummarySection from './SummarySection';

/**
 * The measurement page under its heading, across the whole page: the space at a glance, its plan,
 * model, rooms and files, then where it came from. The plan comes before the details other detail
 * pages lead with, because seeing the space is what a measurement is opened for.
 */
const MeasurementDetail = (): ReactElement => (
  <Grid container spacing={2} sx={detailPageSx}>
    <Grid size={12}>
      <SummarySection />
    </Grid>
    <Grid size={12}>
      <MeasurementTabs />
    </Grid>
    <Grid size={12}>
      <DetailsSection />
    </Grid>
  </Grid>
);

export default MeasurementDetail;
