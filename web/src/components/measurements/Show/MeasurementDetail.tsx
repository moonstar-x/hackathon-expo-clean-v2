import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import { detailStackSx } from '../../../styles/pages';
import DetailsCard from './DetailsCard';
import MeasurementTabs from './MeasurementTabs';
import SummaryCard from './SummaryCard';

/**
 * The measurement page under its heading: the space at a glance, its plan, model, rooms and files,
 * then where it came from. The plan comes before the fields card other detail pages lead with,
 * because seeing the space is what a measurement is opened for.
 */
const MeasurementDetail = (): ReactElement => (
  <Stack spacing={2} sx={detailStackSx}>
    <SummaryCard />
    <MeasurementTabs />
    <DetailsCard />
  </Stack>
);

export default MeasurementDetail;
