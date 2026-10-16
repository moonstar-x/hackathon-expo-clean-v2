import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { watchSx } from '../../styles/appBar';
import AppBarControls from './AppBarControls';
import Clock from './Clock';

// The AppBar's "now" group, the clock with the theme toggle and refresh beside it.
const Watch = (): ReactElement => (
  <Box sx={watchSx}>
    <Clock />
    <AppBarControls />
  </Box>
);

export default Watch;
