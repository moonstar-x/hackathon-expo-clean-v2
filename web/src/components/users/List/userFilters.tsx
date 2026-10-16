import type { ReactElement } from 'react';
import { NullableBooleanInput } from 'react-admin';
import SearchFilter from '../../SearchFilter';

/** The user filters, the same on both layouts: the search always shown, Active from the filter button. */
export const userFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.users.search" />,
  <NullableBooleanInput key="active" source="active" helperText={false} />,
];
