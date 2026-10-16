import type { ReactElement } from 'react';
import { ColumnsButton, ExportButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/**
 * Desktop list toolbar: the result count, then filters, the column picker and the CSV export.
 * No create button: measurements come from the phone.
 */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.measurements.total">
    <FilterButton />
    <ColumnsButton />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
