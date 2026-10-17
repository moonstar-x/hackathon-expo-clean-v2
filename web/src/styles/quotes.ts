// Styles of the quote screens (quotes/, components/quotes).
import type { SxProps, Theme } from '@mui/material/styles';
import { sectionGridSx } from './pages';

/** A parameter tab's inputs: aligned like a form section's, across the whole tab. */
export const parametersGridSx: SxProps<Theme> = [sectionGridSx, { width: '100%' }] as SxProps<Theme>;

/**
 * A parameter's unit, level with its value: a filled input's value sits below its label, and MUI only
 * lowers start adornments to match.
 */
export const parameterUnitSx: SxProps<Theme> = { mt: 2 };

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

/**
 * The card of the quote's tabs never widens the page: inline-size containment keeps its content's
 * width out of the layout, so a wide table scrolls inside the card at any screen width.
 */
export const quoteTabsCardSx: SxProps<Theme> = { contain: 'inline-size' };

/** Label and value pairs of a quote's figures: the labels wrap before the values do. */
export const valuesGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) fit-content(60%)',
  columnGap: 2,
  rowGap: 1,
  m: 0,
};

/** The quote's data tables: tighter columns, so a wide one (the purchase plan has 13) fits a laptop. */
export const quoteTableSx: SxProps<Theme> = {
  mb: 2,
  '& .MuiTableCell-root': { px: 1 },
  '& .MuiTableCell-root:first-of-type': { pl: 2 },
  '& .MuiTableCell-root:last-of-type': { pr: 2 },
};

/** A zone's inputs and where each came from. On phones each input's label goes above its value and source. */
export const zoneInputsTableSx: SxProps<Theme> = (theme: Theme) => ({
  mb: 2,
  [theme.breakpoints.down('sm')]: {
    '& tr': {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      alignItems: 'center',
      columnGap: 1,
      py: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
    },
    '& tr:last-of-type': { borderBottom: 0 },
    '& .MuiTableCell-root': { p: 0, border: 0 },
    '& .MuiTableCell-root:first-of-type': { gridColumn: '1 / -1', color: 'text.secondary', fontSize: 13 },
  },
});

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
