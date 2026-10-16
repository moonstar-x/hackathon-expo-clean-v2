import type { ReactElement } from 'react';
import { CreateButton, ExportButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Desktop list toolbar: the result count, create and the CSV export. */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.categories.total">
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default DesktopActions;
