import type { ReactElement } from 'react';
import { AutocompleteInput, NullableBooleanInput, ReferenceInput } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import SearchFilter from '../../SearchFilter';
import ToggleFilter from '../../ToggleFilter';

/**
 * Only `true` is sent. Switching the toggle off must remove the filter rather than send
 * `false` (which means "not low stock"). react-admin ignores an `undefined` change but
 * strips empty strings from the filter, so off becomes ''.
 */
const trueOrRemove = (value: boolean): true | '' => (value ? true : '');

/**
 * The product filters, shared by the desktop table (the low-stock switch always shown, as SPEC-002
 * asks) and the phone list (everything but the search added from the filter button).
 * Labels come from resources.products.fields.
 */
export const productFilters = (alwaysOn: boolean): ReactElement[] => [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.products.search" />,
  <ReferenceInput key="categoryId" source="categoryId" reference="categories" sort={CATALOG_SORT}>
    <AutocompleteInput optionText="name" helperText={false} />
  </ReferenceInput>,
  <ReferenceInput key="supplierId" source="supplierId" reference="suppliers" sort={CATALOG_SORT}>
    <AutocompleteInput optionText="name" helperText={false} />
  </ReferenceInput>,
  <NullableBooleanInput key="active" source="active" helperText={false} />,
  <NullableBooleanInput key="hazardous" source="hazardous" helperText={false} />,
  <ToggleFilter key="lowStock" source="lowStock" alwaysOn={alwaysOn} parse={trueOrRemove} helperText={false} />,
  <ToggleFilter key="outOfStock" source="outOfStock" parse={trueOrRemove} helperText={false} />,
];
