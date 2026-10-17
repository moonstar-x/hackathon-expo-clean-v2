import type { ReactElement } from 'react';
import { SelectInput } from 'react-admin';
import { quoteText } from '../../../i18n/quotes';
import SearchFilter from '../../SearchFilter';

/**
 * A quoting catalog's filters: the search, always shown, saying what it matches; equivalences can
 * also show only the room types still without a zone type (the data provider turns "unmapped"
 * into the API's filter).
 */
export const catalogFilters = (resource: string): ReactElement[] => [
  <SearchFilter key="q" source="q" alwaysOn placeholder={`app.quoteSettings.search.${resource}`} />,
  ...(resource === 'quote-location-types'
    ? [
        <SelectInput
          key="unmapped"
          source="zoneTypeId"
          label={quoteText.equivalence}
          choices={[{ id: 'unmapped', name: quoteText.unmapped }]}
          translateChoice={false}
          helperText={false}
        />,
      ]
    : []),
];
