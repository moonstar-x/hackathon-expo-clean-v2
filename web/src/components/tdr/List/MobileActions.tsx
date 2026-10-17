import type { ReactElement } from 'react';
import { CreateButton, FilterButton, SortButton } from 'react-admin';
import { TDR_SORT_FIELDS } from '../../../constants/tdr';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort and upload. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.tdr.total" compact>
    <FilterButton />
    <SortButton fields={TDR_SORT_FIELDS} />
    <CreateButton label="app.empty.tdr-documents.action" />
  </ResultsToolbar>
);

export default MobileActions;
