import type { ReactElement } from 'react';
import { Show } from 'react-admin';
import MeasurementDetail from '../../components/measurements/Show/MeasurementDetail';
import MeasurementHeader from '../../components/measurements/Show/MeasurementHeader';

// A plain <div> instead of react-admin's card: the detail is a column of cards of its own.
const MeasurementShow = (): ReactElement => (
  <Show actions={<MeasurementHeader />} component="div" emptyWhileLoading>
    <MeasurementDetail />
  </Show>
);

export default MeasurementShow;
