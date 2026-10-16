import type { ReactElement } from 'react';
import SearchFilter from '../../SearchFilter';

/** Suppliers are searched by name, contact or email; the API takes no other filter. */
export const supplierFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.suppliers.search" />,
];
