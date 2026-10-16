import type { ReactElement } from 'react';
import { CreateButton, ExportButton, FilterButton, SortButton } from 'react-admin';
import { USER_SORT_FIELDS } from '../../../constants/users';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort, create and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.users.total" compact>
    <FilterButton />
    <SortButton fields={USER_SORT_FIELDS} />
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
