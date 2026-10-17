import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Authenticated, Title, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import { panelsSx } from '../../styles/dashboard';
import PageHeader from '../PageHeader';
import ActivityPanel from './ActivityPanel';
import RestockPanel from './RestockPanel';
import StatCards from './StatCards';

/** Home: the four stock numbers, then what needs restocking beside what moved last, level with each other. */
const DashboardContent = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { appTitle } = useAppConfig();
  return (
    <>
      <Title title="ra.page.dashboard" />
      <PageHeader eyebrow={appTitle} title={translate('ra.page.dashboard')} />
      <Stack spacing={2} sx={{ pb: 3 }}>
        <StatCards />
        <Box sx={panelsSx}>
          <RestockPanel />
          <ActivityPanel />
        </Box>
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
