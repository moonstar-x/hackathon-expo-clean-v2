import type { ReactElement } from 'react';
import { ColumnsButton, ExportButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/**
 * Desktop list toolbar: the result count, then filters, the column picker and the CSV export.
 * No create button: a quote starts from a measurement.
 */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.quotes.total">
    <FilterButton />
    <ColumnsButton />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
