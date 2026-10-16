import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import { Authenticated, Title, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import { tablesRowSx } from '../../styles/dashboard';
import PageHeader from '../PageHeader';
import LowStockTable from './LowStockTable';
import RecentMovements from './RecentMovements';
import StatCards from './StatCards';

/** Home: the four stock numbers, then what needs restocking beside what moved last. */
const DashboardContent = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { appTitle } = useAppConfig();
  return (
    <>
      <Title title="ra.page.dashboard" />
      <PageHeader eyebrow={appTitle} title={translate('ra.page.dashboard')} />
      <Stack spacing={2} sx={{ pb: 3 }}>
        <StatCards />
        <Stack direction="row" useFlexGap sx={tablesRowSx}>
          <LowStockTable />
          <RecentMovements />
        </Stack>
      </Stack>
    </>
  );
};

// Custom pages are public by default; <Authenticated> keeps the dashboard from fetching before
// checkAuth passes (<Admin> has no requireAuth, see App.tsx).
const Dashboard = (): ReactElement => (
  <Authenticated>
    <DashboardContent />
  </Authenticated>
);

export default Dashboard;
