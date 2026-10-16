import type { ReactElement } from 'react';
import { AutocompleteInput, DateInput, ReferenceInput } from 'react-admin';
import { USER_SORT } from '../../../constants/users';
import SearchFilter from '../../SearchFilter';

/**
 * The measurement filters, the same on both layouts: the search always shown, the rest added from the
 * filter button. Subido por picks an account (the API's userId filter) instead of matching an email
 * typed in full, and keeps finding a person's uploads after they change their email.
 * Labels come from resources.measurements.fields.
 */
export const measurementFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.measurements.search" />,
  <ReferenceInput key="userId" source="userId" reference="users" sort={USER_SORT}>
    <AutocompleteInput helperText={false} />
  </ReferenceInput>,
  <DateInput key="scannedAt_gte" source="scannedAt_gte" helperText={false} />,
  <DateInput key="scannedAt_lte" source="scannedAt_lte" helperText={false} />,
];
