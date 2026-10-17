import type { ReactElement } from 'react';
import { useGetList, useTranslate, type TranslateFunction, type UseGetListHookValue } from 'react-admin';
import { DASHBOARD_QUERY_OPTIONS, DASHBOARD_ROWS } from '../../constants/dashboard';
import { MOVEMENT_SORT } from '../../constants/stockMovements';
import type { StockMovement } from '../../types/api';
import { errorMessage } from '../../utils/errors';
import EmptyState from '../list/EmptyState';
import ActivityRow from './ActivityRow';
import DashboardPanel from './DashboardPanel';

/** "Movimientos recientes": the latest stock movements, newest first. */
const ActivityPanel = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { data, isPending, error }: UseGetListHookValue<StockMovement> = useGetList<StockMovement>(
    'stock-movements',
    { sort: MOVEMENT_SORT, pagination: { page: 1, perPage: DASHBOARD_ROWS } },
    DASHBOARD_QUERY_OPTIONS,
  );
  return (
    <DashboardPanel
      title={translate('app.dashboard.recentMovements')}
      seeAllTo="/stock-movements"
      isPending={isPending}
      error={error ? translate('app.dashboard.movementsError', { error: errorMessage(error) }) : undefined}
      isEmpty={!data?.length}
      empty={<EmptyState variant="compact" resource="stock-movements" messages="app.empty.activity" />}
    >
      {data?.map(
        (movement: StockMovement): ReactElement => (
          <ActivityRow key={movement.id} movement={movement} />
        ),
      )}
    </DashboardPanel>
  );
};

export default ActivityPanel;
