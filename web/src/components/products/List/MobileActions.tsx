import type { ReactElement } from 'react';
import { CreateButton, ExportButton, FilterButton, SortButton } from 'react-admin';
import { PRODUCT_SORT_FIELDS } from '../../../constants/products';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort, create and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.products.total" compact>
    <FilterButton />
    <SortButton fields={PRODUCT_SORT_FIELDS} />
    <CreateButton />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
