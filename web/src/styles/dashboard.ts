// Styles of the dashboard (components/dashboard).
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { DASHBOARD_ROW_HEIGHT } from '../constants/dashboard';
import type { StatusColor } from '../types/components';
import type { StatCardColor } from '../types/dashboard';

/** The four stat cards: four across from `lg`, two by two on tablets, one per row on phones. */
export const statCardsSx: SxProps<Theme> = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
};

/** A stat card fills its grid cell, and so does its link, so hover and focus cover the whole card. */
export const statCardSx: SxProps<Theme> = { display: 'flex', height: '100%' };

export const statActionSx: SxProps<Theme> = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' };

export const statContentSx: SxProps<Theme> = { flex: 1, width: '100%', '&:last-child': { pb: 2 } };

/** Label on the left, the icon's tile on the right. */
export const statHeadSx: SxProps<Theme> = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 };

export const statLabelSx: SxProps<Theme> = { fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'text.secondary', pt: 0.5 };

/** The icon sits on a soft tile of its own colour. */
export const statIconSx = (color: StatCardColor): SxProps<Theme> => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '10px',
  color: `${color}.main`,
  bgcolor: (theme: Theme): string => alpha(theme.palette[color].main, 0.12),
  '& .MuiSvgIcon-root': { fontSize: 20 },
});

/** A big standalone number: proportional figures read tighter than tabular ones at this size. */
export const statValueSx: SxProps<Theme> = { mt: 0.5, fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em' };

export const statHintSx: SxProps<Theme> = { mt: 0.75, fontSize: 12.5, lineHeight: 1.4, color: 'text.secondary' };

/** The two panels side by side from `lg` (what to restock gets the wider one), stretched to one height. */
export const panelsSx: SxProps<Theme> = {
  display: 'grid',
  gap: 2,
  alignItems: 'stretch',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
};

export const panelSx: SxProps<Theme> = { height: '100%', display: 'flex', flexDirection: 'column' };

/** The rows start right under the header's hairline. */
export const panelHeaderSx: SxProps<Theme> = { mb: 0 };

/** Rows divided by hairlines; the last one leaves the card's own edge to close the panel. */
export const panelListSx: SxProps<Theme> = { p: 0, '& > .MuiListItem-root:last-of-type': { borderBottom: 0 } };

/** A panel row: always the same height, its parts on one line. */
export const panelRowSx: SxProps<Theme> = { minHeight: DASHBOARD_ROW_HEIGHT, px: 2, py: 1, gap: 2, alignItems: 'center' };

/** A restock row has more to say: on phones its meter and button wrap under the name. */
export const restockRowSx: SxProps<Theme> = { ...panelRowSx, flexWrap: { xs: 'wrap', sm: 'nowrap' } };

/** The row's title and the muted line under it. */
export const rowMainSx: SxProps<Theme> = { flex: 1, minWidth: 0 };

/** A restock row's name takes the whole first line on phones. */
export const restockMainSx: SxProps<Theme> = { flex: { xs: '1 1 100%', sm: '1 1 0' }, minWidth: 0 };

export const rowTitleSx: SxProps<Theme> = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'text.primary',
};

export const rowMetaSx: SxProps<Theme> = { fontSize: 12.5, lineHeight: 1.4, color: 'text.secondary', whiteSpace: 'nowrap' };

/** The title's line: the name, then a badge when the product has run out. */
export const rowTitleLineSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 };

/** The meter and its numbers, a fixed width so the meters of every row line up. */
export const restockMeterSx: SxProps<Theme> = {
  width: { xs: 'auto', sm: 196 },
  flex: { xs: '1 1 160px', sm: '0 0 auto' },
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
};

/** The movement's type icon on a soft tile of its colour. */
export const movementIconSx = (color: StatusColor): SxProps<Theme> => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '10px',
  color: `${color}.main`,
  bgcolor: (theme: Theme): string => alpha(theme.palette[color].main, 0.12),
  '& .MuiSvgIcon-root': { fontSize: 18 },
});

/** The change in stock over when it happened, right-aligned. */
export const activityEndSx: SxProps<Theme> = { textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' };

export const panelErrorSx: SxProps<Theme> = { m: 2 };
