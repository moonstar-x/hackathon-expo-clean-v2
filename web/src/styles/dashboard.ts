// Styles of the dashboard (components/dashboard).
import type { SxProps, Theme } from '@mui/material/styles';
import type { StatCardColor } from '../types/dashboard';

/** The four stat cards wrap two by two, then one per row on phones. */
export const statCardsSx: SxProps<Theme> = { flexWrap: 'wrap', gap: 2 };

export const statCardSx: SxProps<Theme> = { flex: '1 1 200px' };

/** The icon sits on a soft tile of its own colour. */
export const statIconSx = (color: StatCardColor): SxProps<Theme> => ({
  color: `${color}.main`,
  bgcolor: (theme: Theme): string => `color-mix(in srgb, ${theme.palette[color].main} 12%, transparent)`,
  borderRadius: 2,
  p: 1.25,
  alignItems: 'center',
  justifyContent: 'center',
});

export const statValueSx: SxProps<Theme> = { fontWeight: 600, fontVariantNumeric: 'tabular-nums' };

/** The two tables sit side by side when there is room for both. */
export const tablesRowSx: SxProps<Theme> = { flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' };

export const tableCardSx: SxProps<Theme> = { flex: '1 1 420px', minWidth: 0 };

export const emptyTableSx: SxProps<Theme> = { px: 2, pb: 2, color: 'text.secondary' };

export const numberCellSx: SxProps<Theme> = { whiteSpace: 'nowrap' };
