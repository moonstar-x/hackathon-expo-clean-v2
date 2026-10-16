import type { ReactElement } from 'react';
import { AutocompleteInput, DateInput, ReferenceInput, SelectInput } from 'react-admin';
import { PRODUCT_SORT } from '../../../constants/products';
import { MOVEMENT_TYPE_CHOICES } from '../../../constants/stockMovements';
import SearchFilter from '../../SearchFilter';

/**
 * The movement filters, the same on both layouts: the search always shown, the rest added from the
 * filter button. Labels come from resources.stock-movements.fields.
 */
export const movementFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.stockMovements.search" />,
  <ReferenceInput key="productId" source="productId" reference="products" sort={PRODUCT_SORT}>
    <AutocompleteInput helperText={false} />
  </ReferenceInput>,
  <SelectInput key="type" source="type" choices={MOVEMENT_TYPE_CHOICES} helperText={false} />,
  <DateInput key="createdAt_gte" source="createdAt_gte" helperText={false} />,
  <DateInput key="createdAt_lte" source="createdAt_lte" helperText={false} />,
];
