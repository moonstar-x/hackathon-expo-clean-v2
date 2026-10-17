// Styles of the quote screens (quotes/, components/quotes).
import type { SxProps, Theme } from '@mui/material/styles';
import { sectionGridSx } from './pages';

/** A parameter tab's inputs: aligned like a form section's, across the whole tab. */
export const parametersGridSx: SxProps<Theme> = [sectionGridSx, { width: '100%' }] as SxProps<Theme>;

/** The fold with the notes on where each parameter comes from: a hairline box, not a floating card. */
export const notesAccordionSx: SxProps<Theme> = {
  width: '100%',
  mt: 2,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '10px',
  bgcolor: 'transparent',
  '&::before': { display: 'none' },
};

/** Under a quote's figures: that it is not a validated offer, its measurement and when it was calculated. */
export const quoteMetaSx: SxProps<Theme> = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  columnGap: 3,
  rowGap: 0.5,
  mt: 2.5,
  pt: 2,
  borderTop: '1px solid',
  borderColor: 'divider',
};

/** The quote's tabs, inset like the measurement's, over a padded panel. */
export const quoteTabsSx: SxProps<Theme> = { px: { xs: 0.5, sm: 1.5 } };

export const quoteTabPanelSx: SxProps<Theme> = { p: { xs: 2, sm: 3 } };

/** The technical offer: cells read top-down, so they align to the top. */
export const offerTableSx: SxProps<Theme> = {
  '& .MuiTableCell-root': { verticalAlign: 'top', py: 1.5 },
  '& .MuiTableCell-head': { verticalAlign: 'bottom', whiteSpace: 'nowrap' },
  // The total sits under the last zone, whose row has no bottom border.
  '& tfoot .MuiTableCell-root': {
    fontSize: 14,
    fontWeight: 600,
    color: 'text.primary',
    borderTop: '1px solid',
    borderBottom: 0,
    borderColor: 'divider',
  },
};

export const offerZoneNameSx: SxProps<Theme> = { fontWeight: 600 };

/** Staff figures, right-aligned in their column. */
export const offerFigureSx: SxProps<Theme> = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/** A zone's name and its risk badge on one line. */
export const offerZoneLineSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1, rowGap: 0.5 };

/** The secondary lines of a cell: the zone type, the schedule, the disinfectant amount. */
export const offerMutedSx: SxProps<Theme> = { color: 'text.secondary', fontSize: 13, lineHeight: 1.5 };

/**
 * A zone's products: what each is for, the product, and its dose, in three aligned columns. Capped,
 * so on wide screens a dose stays near its product.
 */
export const productDosesSx: SxProps<Theme> = {
  display: 'grid',
  maxWidth: '28rem',
  gridTemplateColumns: { xs: 'minmax(0, 1fr) max-content', sm: 'max-content minmax(0, 1fr) max-content' },
  columnGap: 2,
  rowGap: 0.5,
  m: 0,
  lineHeight: 1.5,
  // On phones each product goes under what it is for.
  '& dt': { gridColumn: { xs: '1 / -1', sm: 'auto' }, color: 'text.secondary', fontSize: 13 },
  '& dt:not(:first-of-type)': { mt: { xs: 0.75, sm: 0 } },
  '& dd': { m: 0 },
  '& dd:nth-of-type(odd)': { minWidth: 0, overflowWrap: 'anywhere' },
  '& dd:nth-of-type(even)': { textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
};

/** The zones as cards on phones, one under another. */
export const offerCardsSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', gap: 1.5 };

export const offerCardSx: SxProps<Theme> = { p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, typography: 'body2' };

/** A labelled block of a card: "Frecuencia" over its lines. */
export const offerCardBlockSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', gap: 0.25 };

/** Semibold, so it reads above the products' muted roles. */
export const offerCardLabelSx: SxProps<Theme> = { fontSize: 13, fontWeight: 600, color: 'text.secondary' };

/** A card's staff line, and the total under the cards: label left, figure right. */
export const offerCardStaffSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 2,
  pt: 1.5,
  borderTop: '1px solid',
  borderColor: 'divider',
};

export const offerTotalSx: SxProps<Theme> = [offerCardStaffSx, { px: 2, fontWeight: 600, borderTop: 0 }] as SxProps<Theme>;
