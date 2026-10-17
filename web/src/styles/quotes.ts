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
