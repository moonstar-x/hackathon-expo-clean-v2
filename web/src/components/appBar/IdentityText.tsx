import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { identityEmailSx, identityNameSx, identityTextSx } from '../../styles/appBar';
import type { IdentityProps } from '../../types/appBar';

/**
 * The name over the email, beside the tile in the AppBar; just the email when the account has no
 * name. A long one is cut; the menu has it whole.
 */
const IdentityText = ({ identity }: IdentityProps): ReactElement => (
  <Box component="span" sx={identityTextSx}>
    <Box component="span" sx={identityNameSx}>
      {identity.fullName}
    </Box>
    {identity.fullName === identity.email ? null : (
      <Box component="span" sx={identityEmailSx}>
        {identity.email}
      </Box>
    )}
  </Box>
);

export default IdentityText;
