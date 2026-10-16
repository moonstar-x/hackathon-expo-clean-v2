import type { ReactElement } from 'react';
import { ExportButton, FilterButton, SortButton } from 'react-admin';
import { MEASUREMENT_SORT_FIELDS } from '../../../constants/measurements';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.measurements.total" compact>
    <FilterButton />
    <SortButton fields={MEASUREMENT_SORT_FIELDS} />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
