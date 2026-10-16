import type { ReactElement } from 'react';
import { CreateButton, ExportButton, SortButton } from 'react-admin';
import { SUPPLIER_SORT_FIELDS } from '../../../constants/catalog';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for sort, create and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.suppliers.total" compact>
    <SortButton fields={SUPPLIER_SORT_FIELDS} />
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
