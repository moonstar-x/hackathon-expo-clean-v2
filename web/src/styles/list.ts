// Shared styles of the list kit: the visual language every mobile and
// desktop list composes, so rows, badges and meta lines look the same everywhere.
import { blue, green, orange } from '@mui/material/colors';
import { alpha, darken, type SxProps, type Theme } from '@mui/material/styles';
import { createBreakpoints, type SystemStyleObject } from '@mui/system';
import { FILTER_CONTROL_HEIGHT } from '../constants/components';
import type { EmptyStateVariant, ListRowOptions, Tone } from '../types/list';

/** orange[800] reads 3.1:1 on white, too faint for a badge's small label; this step reads 5.1:1. */
const LIGHT_ORANGE: string = darken(orange[800], 0.25);

/**
 * Mode-aware accent: a darker shade on light paper, a brighter one on dark, so outlines and the
 * small labels they carry stay at least 4.5:1 on the paper (tests/lib/tones.test.ts).
 */
export const toneAccent = (theme: Theme, tone: Tone = 'neutral'): string => {
  const light: boolean = theme.palette.mode === 'light';
  switch (tone) {
    case 'brand':
      return light ? theme.palette.primary.dark : theme.palette.primary.main;
    case 'orange':
      return light ? LIGHT_ORANGE : orange[300];
    case 'blue':
      return light ? blue[800] : blue[300];
    case 'green':
      return light ? green[800] : green[300];
    case 'red':
      return light ? theme.palette.error.dark : theme.palette.error.light;
    default:
      return theme.palette.text.secondary;
  }
};

/**
 * Row dividers and comfortable padding for SimpleList rows. The row (ListItem) draws the divider;
 * when it navigates, its padding sits on the ListItemButton inside, flush with the row: otherwise
 * both were padded and the theme's menu-style button (inset, rounded) drew a tinted or hovered row
 * as a box floating inside it. The button's own hover already stands down on touch screens.
 */
export const listRowSx = ({ avatar = false, clickable = true }: ListRowOptions = {}): SxProps<Theme> => ({
  '& .MuiListItem-root': {
    alignItems: 'flex-start',
    px: clickable ? 0 : 2,
    py: clickable ? 0 : 1.75,
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  '& .MuiListItemButton-root': {
    alignItems: 'flex-start',
    px: 2,
    py: 1.75,
    m: 0,
    borderRadius: 0,
    transition: 'background-color 140ms ease',
  },
  '& .MuiListItem-root:last-child': { borderBottom: 'none' },
  '& .MuiListItemText-root': { my: 0 },
  '& .MuiListItemText-secondary': { mt: 0.625 },
  ...(avatar ? { '& .MuiListItemAvatar-root': { mt: 0.5 } } : {}),
});

/** Bold primary name: wraps on overflow, never truncates (truncation causes sideways scroll). */
export const primaryNameSx: SxProps<Theme> = {
  display: 'block',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  lineHeight: 1.3,
  wordBreak: 'break-word',
  whiteSpace: 'normal',
};

/**
 * A list's actions bar: a full row under the filters (react-admin aligns the toolbar's items to
 * the right, and on phones stacks them as a column), with the result count pushed to the left.
 * No side padding, so the count lines up with the filters and the table's left edge.
 */
export const resultsToolbarSx: SxProps<Theme> = { width: '100%', alignItems: 'center', px: 0 };

export const listTotalSx: SxProps<Theme> = { mr: 'auto', fontVariantNumeric: 'tabular-nums' };

/**
 * react-admin turns its toolbar buttons into icons (with a tooltip) below `sm`, but the card
 * layout runs up to `md`, where "Añadir filtro", "Ordenar por…" and "Exportar" spelled out
 * stack onto three rows. Under this theme `sm` means `md`, so they stay icons there too.
 */
export const compactActionsTheme = (outer: Theme): Theme => ({
  ...outer,
  breakpoints: createBreakpoints({
    unit: outer.breakpoints.unit,
    values: { ...outer.breakpoints.values, sm: outer.breakpoints.values.md },
  }),
});

export const metaTextSx: SxProps<Theme> = { fontSize: 12.5, lineHeight: 1.4, color: 'text.secondary' };
export const metaIconSx: SxProps<Theme> = { fontSize: 15, color: 'text.disabled', flexShrink: 0 };

/** The StatBar strip: a tinted, bordered band that wraps on narrow screens and clips the hairlines at its edges. */
export const statBarSx: SxProps<Theme> = {
  display: 'inline-flex',
  flexWrap: 'wrap',
  maxWidth: '100%',
  alignItems: 'stretch',
  borderRadius: '10px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: (theme: Theme): string => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.025)'),
  overflow: 'hidden',
};

/** Hairlines above and to the left of every item; the strip's padding box clips those on its outer edges. */
export const statBarItemSx: SxProps<Theme> = {
  display: 'inline-flex',
  flexDirection: 'column',
  flex: '1 0 auto',
  px: 1.25,
  py: 0.5,
  boxShadow: (theme: Theme): string => `-1px 0 0 ${theme.palette.divider}, 0 -1px 0 ${theme.palette.divider}`,
};

export const statBarLabelSx: SxProps<Theme> = {
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.disabled',
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
};

export const statBarValueSx: SxProps<Theme> = {
  fontSize: 14,
  fontWeight: 600,
  color: 'text.primary',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
};

/** A table cell kept on one line, for short codes (a SKU) that read wrong when broken at a hyphen. */
export const noWrapCellSx = (): SxProps => ({ whiteSpace: 'nowrap' });

/**
 * A list's search box: as tall as the labeled filters beside it, and wide enough for a placeholder
 * that says what it searches ("Buscar por SKU, nombre o descripción"); the whole row on phones.
 */
export const searchFilterSx: SxProps<Theme> = {
  minWidth: { xs: '100%', sm: 420 },
  '& .MuiFilledInput-root': { minHeight: FILTER_CONTROL_HEIGHT },
  '& .MuiInputAdornment-positionStart': { color: 'text.disabled', mr: 0.5 },
};

/**
 * A yes-only filter as a pill as tall as the inputs beside it: their fill and hairline, its label
 * before a compact switch, and a primary tint while it is on.
 */
export const toggleFilterSx = (theme: Theme): SystemStyleObject<Theme> => ({
  height: FILTER_CONTROL_HEIGHT,
  justifyContent: 'center',
  px: 1.75,
  borderRadius: '10px',
  border: '1px solid',
  borderColor: alpha(theme.palette.text.primary, 0.06),
  bgcolor: alpha(theme.palette.text.primary, 0.04),
  transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.06) },
  '&:has(.Mui-checked)': {
    bgcolor: alpha(theme.palette.primary.main, 0.08),
    borderColor: alpha(theme.palette.primary.main, 0.4),
  },
  '&:has(.Mui-focusVisible)': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}` },
  '& .MuiFormControlLabel-root': { m: 0, gap: 1.5, flexDirection: 'row-reverse' },
  '& .MuiFormControlLabel-label': { fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' },
  '& .MuiSwitch-root': { m: 0 },
});

/** An empty state: centered, roomier when it stands alone than inside a list or a dashboard panel. */
export const emptyStateSx = (variant: EmptyStateVariant): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: variant === 'compact' ? 0.75 : 1,
  px: 3,
  py: { page: { xs: 6, sm: 8 }, inline: 6, compact: 3 }[variant],
});

/** The resource's icon on a soft primary tile. */
export const emptyIconSx = (variant: EmptyStateVariant): SxProps<Theme> => {
  const size: number = variant === 'compact' ? 40 : 56;
  return {
    width: size,
    height: size,
    mb: variant === 'compact' ? 0.5 : 1,
    display: 'grid',
    placeItems: 'center',
    borderRadius: variant === 'compact' ? '10px' : '14px',
    color: 'primary.main',
    bgcolor: (theme: Theme): string => alpha(theme.palette.primary.main, 0.08),
    '& .MuiSvgIcon-root': { fontSize: variant === 'compact' ? 22 : 28 },
  };
};

export const emptyBodySx: SxProps<Theme> = { maxWidth: '52ch', color: 'text.secondary', textWrap: 'pretty' };

/** The steps that fill a list (Mediciones), numbered: they are a real sequence. */
export const emptyStepsSx: SxProps<Theme> = {
  m: 0,
  mt: 0.5,
  pl: 2.5,
  textAlign: 'left',
  color: 'text.secondary',
  fontSize: 14,
  lineHeight: 1.6,
  '& li::marker': { color: 'primary.main', fontWeight: 600 },
};

export const emptyActionsSx: SxProps<Theme> = { mt: 1.5 };
