import type { ReactElement } from 'react';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { appBarDividerSx } from '../../styles/appBar';
import Watch from './Watch';

// What sits between the title and the user menu, from `md`: the clock and its
// controls, then a hairline before the person. Narrower bars have no room; the menu holds them.
const AppBarToolbar = (): ReactElement | null => {
  const compact: boolean = useMediaQuery((theme: Theme): string => theme.breakpoints.down('md'));
  if (compact) return null;
  return (
    <Stack direction="row" alignItems="center">
      <Watch />
      <Divider orientation="vertical" flexItem sx={appBarDividerSx} />
    </Stack>
  );
};

export default AppBarToolbar;
