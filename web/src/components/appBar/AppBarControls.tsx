import type { ReactElement } from 'react';
import { RefreshIconButton, ToggleThemeButton } from 'react-admin';

/** The clock's companions (theme toggle and refresh), shared with the mobile user menu. */
const AppBarControls = (): ReactElement => (
  <>
    <ToggleThemeButton />
    <RefreshIconButton />
  </>
);

export default AppBarControls;
