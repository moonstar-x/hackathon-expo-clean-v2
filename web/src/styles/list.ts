// Shared styles of the list kit: the visual language every mobile and
// desktop list composes, so rows, badges and meta lines look the same everywhere.
import { blue, green, orange } from '@mui/material/colors';
import type { SxProps, Theme } from '@mui/material/styles';
import { createBreakpoints } from '@mui/system';
import type { ListRowOptions, Tone } from '../types/list';

/** Mode-aware accent: a darker shade on light paper, a brighter one on dark, so outlines stay legible. */
export const toneAccent = (theme: Theme, tone: Tone = 'neutral'): string => {
  const light: boolean = theme.palette.mode === 'light';
  switch (tone) {
    case 'brand':
      return light ? theme.palette.primary.dark : theme.palette.primary.main;
    case 'orange':
      return light ? orange[800] : orange[300];
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

/**
 * A list's search box: as tall as the labeled filters beside it, and wide enough for a placeholder
 * that says what it searches ("Buscar por SKU, nombre o descripción"); the whole row on phones.
 */
export const searchFilterSx: SxProps<Theme> = {
  mb: 0.5,
  minWidth: { xs: '100%', sm: 360 },
  '& .MuiFilledInput-root': { minHeight: 50 },
};
