import type { ReactElement } from 'react';
import { DateInput, SelectInput } from 'react-admin';
import { QUOTE_STATUSES } from '../../../constants/quotes';
import { quoteEnums } from '../../../i18n/quotes';
import type { Choice } from '../../../types/components';
import { trueOrRemove } from '../../../utils/filters';
import SearchFilter from '../../SearchFilter';
import ToggleFilter from '../../ToggleFilter';

const statusChoices: Choice[] = QUOTE_STATUSES.map((status: string): Choice => ({ id: status, name: quoteEnums[status] }));

/**
 * The quote filters, the same on both layouts: the search always shown (it matches the name, the
 * city and the notes), the rest added from the filter button. Labels come from resources.quotes.fields.
 */
export const quoteFilters: ReactElement[] = [
  <SearchFilter key="q" source="q" alwaysOn placeholder="app.quotes.search" />,
  <SelectInput key="status" source="status" choices={statusChoices} translateChoice={false} helperText={false} />,
  <ToggleFilter key="isStale" source="isStale" parse={trueOrRemove} helperText={false} />,
  <DateInput key="createdAt_gte" source="createdAt_gte" helperText={false} />,
  <DateInput key="createdAt_lte" source="createdAt_lte" helperText={false} />,
];
