import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { AVATAR_SIZE } from '../../constants/brand';
import { avatarTileSx } from '../../styles/appBar';
import type { InitialsAvatarProps } from '../../types/appBar';
import { initials } from '../../utils/identity';

/** The signed-in person as a brand tile with their initials; a quiet placeholder until known. */
const InitialsAvatar = ({ name, size = AVATAR_SIZE }: InitialsAvatarProps): ReactElement => (
  <Box component="span" aria-hidden sx={avatarTileSx(size, name !== undefined)}>
    {name === undefined ? null : initials(name)}
  </Box>
);

export default InitialsAvatar;
