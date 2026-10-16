import type { ReactElement } from 'react';
import SearchFilter from '../../SearchFilter';

/** Categories are searched by name or description; the API takes no other filter. */
export const categoryFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.categories.search" />,
];
