import type { ReactElement } from 'react';
import { BooleanField, DataTable, List, NumberField, ReferenceField } from 'react-admin';
import { APP_LOCALE } from '../../../constants/app';
import { CATALOG_SORT } from '../../../constants/quoteSettings';
import { quoteEnums } from '../../../i18n/quotes';
import type { CatalogProps } from '../../../types/quotes';
import AppPagination from '../../AppPagination';
import EmptyState from '../../list/EmptyState';
import CatalogActions from './CatalogActions';
import { catalogFilters } from './catalogFilters';

const PRODUCT_FIGURES: string[] = ['pricePerContainer', 'pricePerUnit', 'costPerLiterOfSolution', 'effectiveStock'];

/** A quoting catalog as a table; a row opens its form. Labels come from resources.<catalog>.fields. */
const CatalogDesktopList = ({ resource }: CatalogProps): ReactElement => (
  <List
    resource={resource}
    filters={catalogFilters(resource)}
    sort={CATALOG_SORT[resource]}
    actions={<CatalogActions />}
    pagination={<AppPagination />}
    empty={<EmptyState variant="page" />}
  >
    <DataTable rowClick="edit" bulkActionButtons={false} empty={<EmptyState />}>
      {resource === 'quote-location-types' ? (
        <>
          <DataTable.Col source="label" />
          <DataTable.Col source="zoneTypeId">
            <ReferenceField source="zoneTypeId" reference="quote-zone-types" link={false} />
          </DataTable.Col>
        </>
      ) : (
        <>
          <DataTable.Col source="name" />
          {resource === 'quote-zone-types' ? (
            <DataTable.Col source="risk" render={(record: Record<string, unknown>): string => quoteEnums[record.risk as string] ?? ''} />
          ) : null}
          {resource === 'quote-schedules' ? <DataTable.Col source="serviceHoursPerDay" align="right" /> : null}
          {resource === 'quote-products'
            ? PRODUCT_FIGURES.map(
                (key: string): ReactElement => (
                  <DataTable.Col key={key} source={key} align="right" disableSort>
                    <NumberField source={key} locales={APP_LOCALE} />
                  </DataTable.Col>
                ),
              )
            : null}
          <DataTable.Col source="active" field={BooleanField} />
        </>
      )}
    </DataTable>
  </List>
);

export default CatalogDesktopList;
