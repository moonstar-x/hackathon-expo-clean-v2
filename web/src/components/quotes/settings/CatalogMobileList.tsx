import type { ReactElement } from 'react';
import { InfiniteList, SimpleList, useTranslate, type TranslateFunction } from 'react-admin';
import { CATALOG_SORT } from '../../../constants/quoteSettings';
import { listRowSx } from '../../../styles/list';
import type { CatalogProps } from '../../../types/quotes';
import EmptyState from '../../list/EmptyState';
import OutlinedBadge from '../../list/OutlinedBadge';
import PrimaryRow from '../../list/PrimaryRow';
import CatalogActions from './CatalogActions';
import { catalogFilters } from './catalogFilters';
import CatalogSecondary from './CatalogSecondary';

/** A quoting catalog as cards that load more as you scroll; "Inactivo" top-right on what is no longer used. */
const CatalogMobileList = ({ resource }: CatalogProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <InfiniteList
      resource={resource}
      filters={catalogFilters(resource)}
      sort={CATALOG_SORT[resource]}
      actions={<CatalogActions compact />}
      empty={<EmptyState variant="page" />}
    >
      <SimpleList
        rowClick="edit"
        primaryText={(record: Record<string, unknown>): ReactElement => (
          <PrimaryRow end={record.active === false ? <OutlinedBadge label={translate('app.quoteSettings.inactive')} dense /> : null}>
            {(record.name ?? record.label ?? '') as string}
          </PrimaryRow>
        )}
        secondaryText={<CatalogSecondary resource={resource} />}
        empty={<EmptyState />}
        sx={listRowSx()}
      />
    </InfiniteList>
  );
};

export default CatalogMobileList;
