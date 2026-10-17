import type { ReactElement } from 'react';
import { ExportButton, FilterButton, SortButton } from 'react-admin';
import { QUOTE_SORT_FIELDS } from '../../../constants/quotes';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.quotes.total" compact>
    <FilterButton />
    <SortButton fields={QUOTE_SORT_FIELDS} />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
