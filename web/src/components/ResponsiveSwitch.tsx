import type { ReactElement } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import type { ResponsiveSwitchProps } from '../types/components';

// Shows one of two views, by screen width. Follows
// react-admin's "SimpleList on small screens" pattern: the mobile body below `md`, the desktop one
// above. Not `sm`: below `md` the sidebar leaves a table under 650px, too narrow
// for these columns, so tablets get the cards. The theme sets `noSsr` on useMediaQuery, so only one
// of the two ever renders and fetches.
const ResponsiveSwitch = ({ mobile, desktop }: ResponsiveSwitchProps): ReactElement => {
  const isSmall: boolean = useMediaQuery((theme: Theme): string => theme.breakpoints.down('md'));
  return isSmall ? mobile : desktop;
};

export default ResponsiveSwitch;
