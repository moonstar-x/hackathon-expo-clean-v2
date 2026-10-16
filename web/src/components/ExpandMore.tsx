import type { ReactElement } from 'react';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Theme } from '@mui/material/styles';
import { mergeSx } from '../styles/sx';
import type { ExpandMoreProps } from '../types/components';

// The chevron that turns when a card or row expands. Give it an aria-label and
// aria-expanded so screen readers announce the toggle.
const ExpandMore = ({ expand, sx, ...props }: ExpandMoreProps): ReactElement => (
  <IconButton
    {...props}
    sx={mergeSx(
      {
        ml: 'auto',
        transform: expand ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: (theme: Theme): string =>
          theme.transitions.create('transform', { duration: theme.transitions.duration.shortest }),
      },
      sx,
    )}
  >
    <ExpandMoreIcon />
  </IconButton>
);

export default ExpandMore;
