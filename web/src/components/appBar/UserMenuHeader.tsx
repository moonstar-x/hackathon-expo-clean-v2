import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { menuEmailSx, menuNameSx, userMenuHeaderSx } from '../../styles/appBar';
import type { IdentityProps } from '../../types/appBar';
import InitialsAvatar from './InitialsAvatar';

/** Top of the user menu: who is signed in, in full, and the email they sign in with. */
const UserMenuHeader = ({ identity }: IdentityProps): ReactElement => (
  <Box sx={userMenuHeaderSx}>
    <InitialsAvatar name={identity.fullName} size={36} />
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={menuNameSx}>{identity.fullName}</Typography>
      {identity.fullName === identity.email ? null : (
        <Typography component="p" sx={menuEmailSx}>
          {identity.email}
        </Typography>
      )}
    </Box>
  </Box>
);

// MUI's MenuList skips children marked like this when it picks the item to focus on opening.
UserMenuHeader.muiSkipListHighlight = true;

export default UserMenuHeader;
