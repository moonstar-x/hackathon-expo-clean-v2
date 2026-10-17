import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import List from '@mui/material/List';
import { Link } from 'react-router-dom';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { panelErrorSx, panelHeaderSx, panelListSx, panelSx } from '../../styles/dashboard';
import type { DashboardPanelProps } from '../../types/dashboard';
import PanelSkeleton from './PanelSkeleton';

/**
 * One of the dashboard's two panels: a title with "Ver todos", then its rows, or skeleton rows of the
 * same height while they load, an empty state, or the error. It fills its grid row, so both panels
 * end level.
 */
const DashboardPanel = ({ title, seeAllTo, isPending, error, isEmpty, empty, children }: DashboardPanelProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Card component="section" aria-label={title} sx={panelSx}>
      <CardHeader
        title={title}
        slotProps={{ title: { component: 'h2', variant: 'h6' } }}
        action={
          <Button component={Link} to={seeAllTo}>
            {translate('app.dashboard.seeAll')}
          </Button>
        }
        sx={panelHeaderSx}
      />
      {error ? (
        <Alert severity="error" sx={panelErrorSx}>
          {error}
        </Alert>
      ) : isPending ? (
        <PanelSkeleton />
      ) : isEmpty ? (
        empty
      ) : (
        <List sx={panelListSx}>{children}</List>
      )}
    </Card>
  );
};

export default DashboardPanel;
