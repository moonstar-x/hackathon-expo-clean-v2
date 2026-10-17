import type { ReactElement } from 'react';
import { CreateButton, FilterButton } from 'react-admin';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Desktop list toolbar: the result count, filters and Subir documento. */
const DesktopActions = (): ReactElement => (
  <ResultsToolbar total="app.tdr.total">
    <FilterButton />
    <CreateButton label="app.empty.tdr-documents.action" />
  </ResultsToolbar>
);

export default DesktopActions;
