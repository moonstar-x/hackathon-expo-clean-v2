import type { ReactElement } from 'react';
import { CreateButton, ExportButton, FilterButton, SortButton } from 'react-admin';
import { MOVEMENT_SORT_FIELDS } from '../../../constants/stockMovements';
import ResultsToolbar from '../../list/ResultsToolbar';

/** Card layout toolbar: the result count, then icons for filters, sort, a new movement and the CSV export. */
const MobileActions = (): ReactElement => (
  <ResultsToolbar total="app.stockMovements.total" compact>
    <FilterButton />
    <SortButton fields={MOVEMENT_SORT_FIELDS} />
    <CreateButton label="app.stockMovements.create" />
    <ExportButton />
  </ResultsToolbar>
);

export default MobileActions;
