import type { ReactElement } from 'react';
import { CreateButton, ExportButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Desktop list toolbar: the result count, then filters, create and the CSV export. */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.users.total">
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
