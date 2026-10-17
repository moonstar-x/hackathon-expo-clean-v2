import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Skeleton from '@mui/material/Skeleton';
import { DASHBOARD_ROWS } from '../../constants/dashboard';
import { panelListSx, panelRowSx, rowMainSx } from '../../styles/dashboard';

const ROWS: number[] = Array.from({ length: DASHBOARD_ROWS }, (_: unknown, index: number): number => index);

/** The panel's rows while they load, at their final height, so nothing moves when they arrive. */
const PanelSkeleton = (): ReactElement => (
  <List sx={panelListSx} aria-hidden>
    {ROWS.map(
      (row: number): ReactElement => (
        <ListItem key={row} divider={row < DASHBOARD_ROWS - 1} sx={panelRowSx}>
          <Box sx={rowMainSx}>
            <Skeleton width="55%" />
            <Skeleton width="30%" />
          </Box>
          <Skeleton width={120} />
        </ListItem>
      ),
    )}
  </List>
);

export default PanelSkeleton;
