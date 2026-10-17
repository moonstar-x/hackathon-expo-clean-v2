import type { ReactElement } from 'react';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useGetList, useTranslate, type TranslateFunction, type UseGetListHookValue } from 'react-admin';
import { DASHBOARD_QUERY_OPTIONS, DASHBOARD_ROWS } from '../../constants/dashboard';
import type { Product } from '../../types/api';
import type { ListLinkSort } from '../../types/dashboard';
import { errorMessage } from '../../utils/errors';
import { productListLink } from '../../utils/links';
import EmptyState from '../list/EmptyState';
import DashboardPanel from './DashboardPanel';
import RestockRow from './RestockRow';

const LOWEST_FIRST: ListLinkSort = { field: 'quantity', order: 'ASC' };
const LOW_STOCK_FILTER: Record<string, unknown> = { active: true, lowStock: true };

/** "Por reponer": the active products at or below their reorder line, emptiest first. */
const RestockPanel = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { data, isPending, error }: UseGetListHookValue<Product> = useGetList<Product>(
    'products',
    { filter: LOW_STOCK_FILTER, sort: LOWEST_FIRST, pagination: { page: 1, perPage: DASHBOARD_ROWS } },
    DASHBOARD_QUERY_OPTIONS,
  );
  return (
    <DashboardPanel
      title={translate('app.dashboard.restock')}
      seeAllTo={productListLink(LOW_STOCK_FILTER, LOWEST_FIRST)}
      isPending={isPending}
      error={error ? translate('app.dashboard.lowStockError', { error: errorMessage(error) }) : undefined}
      isEmpty={!data?.length}
      empty={<EmptyState variant="compact" resource="products" messages="app.empty.restock" icon={TaskAltIcon} action={false} />}
    >
      {data?.map(
        (product: Product): ReactElement => (
          <RestockRow key={product.id} product={product} />
        ),
      )}
    </DashboardPanel>
  );
};

export default RestockPanel;
