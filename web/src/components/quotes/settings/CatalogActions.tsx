import type { ReactElement } from 'react';
import {
  CreateButton,
  ExportButton,
  FilterButton,
  useResourceContext,
  useResourceDefinition,
  type ResourceDefinition,
} from 'react-admin';
import type { CatalogActionsProps } from '../../../types/quotes';
import ResultsToolbar from '../../list/ResultsToolbar';

/**
 * A quoting catalog's toolbar: the result count, then more filters (equivalences have one), create
 * when the catalog takes new records, and the CSV export; icons on the card layout (`compact`).
 */
const CatalogActions = ({ compact = false }: CatalogActionsProps): ReactElement => {
  const resource: string | undefined = useResourceContext();
  const { hasCreate }: ResourceDefinition = useResourceDefinition();
  return (
    <ResultsToolbar total={`app.quoteSettings.total.${resource ?? ''}`} compact={compact}>
      <FilterButton />
      {hasCreate ? <CreateButton /> : null}
      <ExportButton />
    </ResultsToolbar>
  );
};

export default CatalogActions;
