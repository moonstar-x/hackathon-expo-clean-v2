import type { ReactElement } from 'react';
import { ColumnsButton, CreateButton, ExportButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Desktop list toolbar: the result count, then more filters, the column picker, create and the CSV export. */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.products.total">
    <FilterButton />
    <ColumnsButton />
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
