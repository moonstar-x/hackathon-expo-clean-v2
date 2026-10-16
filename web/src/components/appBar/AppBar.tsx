import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTheme, type Theme } from '@mui/material/styles';
import { AppBar } from 'react-admin';
import logoHorizontal from '../../assets/brand/logo-horizontal.svg';
import logoHorizontalInverse from '../../assets/brand/logo-horizontal-inverse.svg';
import logoIcon from '../../assets/brand/logo-icon.svg';
import logoIconInverse from '../../assets/brand/logo-icon-inverse.svg';
import { LOGO_HEIGHT } from '../../constants/brand';
import AppBarToolbar from './AppBarToolbar';
import MarqueeTitlePortal from './MarqueeTitlePortal';
import AppUserMenu from './UserMenu';

// The AppBar, with the CleanCode lockup: the regular logo on light paper and the
// inverse one in dark mode. Phones get the icon alone (the horizontal logo's 200px minimum width
// does not fit next to the menu button and avatar).
const AppAppBar = (): ReactElement => {
  const theme: Theme = useTheme();
  const dark: boolean = theme.palette.mode === 'dark';
  return (
    <AppBar userMenu={<AppUserMenu />} toolbar={<AppBarToolbar />}>
      <Box
        component="img"
        src={dark ? logoHorizontalInverse : logoHorizontal}
        alt="CleanCode"
        sx={{ display: { xs: 'none', sm: 'block' }, height: LOGO_HEIGHT, mx: 1.5 }}
      />
      <Box
        component="img"
        src={dark ? logoIconInverse : logoIcon}
        alt="CleanCode"
        sx={{ display: { xs: 'block', sm: 'none' }, height: 32, mr: 1 }}
      />
      <MarqueeTitlePortal />
    </AppBar>
  );
};

export default AppAppBar;
