import type { MouseEvent, ReactElement } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { menuNowSx } from '../../styles/appBar';
import AppBarControls from './AppBarControls';
import Clock from './Clock';

/**
 * What the narrow AppBar has no room for, in the user menu: the clock, the theme toggle and
 * refresh. Clicks don't close the menu, since these controls act in place.
 */
const MobileUserMenuControls = (): ReactElement => (
  <Box onClick={(event: MouseEvent<HTMLDivElement>): void => event.stopPropagation()}>
    <Divider />
    <Box sx={menuNowSx}>
      <Clock align="left" />
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <AppBarControls />
      </Box>
    </Box>
  </Box>
);

// MUI's MenuList skips children marked like this when it picks the item to focus on opening.
MobileUserMenuControls.muiSkipListHighlight = true;

export default MobileUserMenuControls;
