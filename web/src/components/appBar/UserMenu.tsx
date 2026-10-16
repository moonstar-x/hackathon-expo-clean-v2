import { useCallback, useMemo, useState, type MouseEvent, type ReactElement } from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Logout,
  UserMenuContextProvider,
  useGetIdentity,
  useTranslate,
  type TranslateFunction,
  type UseGetIdentityResult,
  type UserMenuContextValue,
} from 'react-admin';
import { USER_MENU_ANCHOR, USER_MENU_ID, USER_MENU_TRANSFORM } from '../../constants/components';
import { chevronSx, userButtonSx } from '../../styles/appBar';
import type { AppIdentity } from '../../types/appBar';
import { isAppIdentity } from '../../utils/identity';
import IdentityText from './IdentityText';
import InitialsAvatar from './InitialsAvatar';
import MobileUserMenuControls from './MobileUserMenuControls';
import UserMenuHeader from './UserMenuHeader';

// react-admin's UserMenu, with its own trigger: the initials tile and, from `md`, the name over
// the email. The menu says who is signed in; below `md` it also holds the clock and the controls
// the AppBar has no room for. Then logout.
const AppUserMenu = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { identity }: UseGetIdentityResult = useGetIdentity();
  const compact: boolean = useMediaQuery((theme: Theme): string => theme.breakpoints.down('md'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close: () => void = useCallback((): void => setAnchor(null), []);
  const context: UserMenuContextValue = useMemo((): UserMenuContextValue => ({ onClose: close }), [close]);
  const person: AppIdentity | undefined = isAppIdentity(identity) ? identity : undefined;
  const open: boolean = anchor !== null;

  return (
    <>
      <ButtonBase
        aria-label={translate('ra.auth.user_menu')}
        aria-haspopup="menu"
        aria-controls={open ? USER_MENU_ID : undefined}
        aria-expanded={open || undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>): void => setAnchor(event.currentTarget)}
        sx={userButtonSx}
      >
        <InitialsAvatar name={person?.fullName} />
        {person && !compact ? <IdentityText identity={person} /> : null}
        {compact ? null : <ExpandMoreIcon sx={chevronSx(open)} />}
      </ButtonBase>
      <UserMenuContextProvider value={context}>
        <Menu
          id={USER_MENU_ID}
          disableScrollLock
          anchorEl={anchor}
          anchorOrigin={USER_MENU_ANCHOR}
          transformOrigin={USER_MENU_TRANSFORM}
          open={open}
          onClose={close}
        >
          {person ? <UserMenuHeader identity={person} /> : null}
          {compact ? <MobileUserMenuControls /> : null}
          <Divider />
          <Logout />
        </Menu>
      </UserMenuContextProvider>
    </>
  );
};

export default AppUserMenu;
