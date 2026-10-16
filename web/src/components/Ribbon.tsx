import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTheme, type Theme } from '@mui/material/styles';
import { ribbonSx } from '../styles/ribbon';
import { mergeSx } from '../styles/sx';
import type { RibbonProps } from '../types/components';

// A corner ribbon that overflows its card edge with a folded tip (Semantic UI
// style). The card needs `position: relative` and `overflow: visible`.
const Ribbon = ({
  children,
  color = 'primary',
  size = 'medium',
  variant = 'filled',
  side = 'right',
  sx,
  ...props
}: RibbonProps): ReactElement => {
  const theme: Theme = useTheme();
  return (
    <Box sx={mergeSx(ribbonSx(theme, color, size, variant, side), sx)} {...props}>
      {children}
    </Box>
  );
};

export default Ribbon;
