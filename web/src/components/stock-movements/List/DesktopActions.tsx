import type { ReactElement } from 'react';
import { ColumnsButton, CreateButton, ExportButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Desktop list toolbar: the result count, then filters, the column picker, a new movement and the CSV export. */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.stockMovements.total">
    <FilterButton />
    <ColumnsButton />
    <CreateButton label="app.stockMovements.create" />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
