import type { ReactElement, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ErrorIcon from '@mui/icons-material/Error';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PaidIcon from '@mui/icons-material/Paid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useDataProvider, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import { DASHBOARD_QUERY_OPTIONS } from '../../constants/dashboard';
import { statCardsSx } from '../../styles/dashboard';
import type { Stats } from '../../types/api';
import type { InventoryDataProvider } from '../../types/providers';
import { formatCurrency } from '../../utils/format';
import { productListLink } from '../../utils/links';
import { errorMessage } from '../../utils/errors';
import StatCard from './StatCard';

/** The four numbers of SPEC-002 §7.5; each but the value opens the matching product list. */
const StatCards = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { currency } = useAppConfig();
  const dataProvider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
  const { data: stats, isPending, error }: UseQueryResult<Stats> = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: (): Promise<Stats> => dataProvider.getStats(),
    ...DASHBOARD_QUERY_OPTIONS,
  });

  if (error) {
    return <Alert severity="error">{translate('app.dashboard.statsError', { error: errorMessage(error) })}</Alert>;
  }

  const value = (shown: ReactNode): ReactNode => (isPending ? <Skeleton width={60} /> : shown);
  return (
    <Stack direction="row" useFlexGap sx={statCardsSx}>
      <StatCard
        title={translate('app.dashboard.activeProducts')}
        value={value(stats?.products.active)}
        hint={stats ? translate('app.dashboard.totalProducts', { smart_count: stats.products.total }) : undefined}
        icon={<Inventory2Icon />}
        to={productListLink({ active: true })}
      />
      <StatCard
        title={translate('app.dashboard.lowStock')}
        value={value(stats?.products.lowStock)}
        icon={<WarningAmberIcon />}
        color="warning"
        to={productListLink({ active: true, lowStock: true }, { field: 'quantity', order: 'ASC' })}
      />
      <StatCard
        title={translate('app.dashboard.outOfStock')}
        value={value(stats?.products.outOfStock)}
        icon={<ErrorIcon />}
        color="error"
        to={productListLink({ active: true, outOfStock: true })}
      />
      <StatCard
        title={translate('app.dashboard.stockValue')}
        value={value(stats ? formatCurrency(stats.stockValue, currency) : undefined)}
        hint={translate('app.dashboard.activeOnly')}
        icon={<PaidIcon />}
        color="success"
      />
    </Stack>
  );
};

export default StatCards;
