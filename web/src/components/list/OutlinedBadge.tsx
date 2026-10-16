import type { ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { toneAccent } from '../../styles/list';
import type { OutlinedBadgeProps } from '../../types/list';

/**
 * Outlined chip of the list kit: `tone` paints border, label and icon together. All
 * three are set explicitly because the theme's MuiChip override forces labels to the text color.
 */
const OutlinedBadge = ({ label, icon, tone, dense = false }: OutlinedBadgeProps): ReactElement => (
  <Chip
    component="span"
    size="small"
    variant="outlined"
    icon={icon}
    label={label}
    sx={(theme: Theme): SystemStyleObject<Theme> => {
      const accent: string = toneAccent(theme, tone);
      return {
        height: dense ? 19 : 22,
        fontSize: dense ? 10.5 : 11.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        borderRadius: dense ? '10px' : '11px',
        bgcolor: 'transparent',
        borderColor: tone ? alpha(accent, 0.5) : theme.palette.divider,
        '.MuiChip-label': { px: 0.875, color: accent },
        '.MuiChip-icon': { fontSize: 14, ml: '5px', mr: '-3px', color: accent },
      };
    }}
  />
);

export default OutlinedBadge;
