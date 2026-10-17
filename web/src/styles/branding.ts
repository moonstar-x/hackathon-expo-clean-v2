// Styles of the Empresa page's "Logo y colores" section: the quote's header in miniature, on the
// document's white paper in both themes (the PDF is printed on white), with the logo and color
// controls beside it.
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { DOCUMENT_PAPER_COLOR, DOCUMENT_TEXT_COLOR } from '../constants/quoteDocuments';
import type { DocumentColors } from '../types/quoteDocuments';
import { toneAccent } from './list';

/** A new color follows the picker without a jump; nothing moves, so reduced motion keeps it. */
const recolor: string = ['background-color', 'color'].map((property: string): string => `${property} 150ms cubic-bezier(0.23, 1, 0.32, 1)`).join(', ');

/** The miniature's sheet: a card of white paper; while a file is dragged over it, a dashed ring says it takes it. */
export const previewSx = (dragging: boolean): SxProps<Theme> => ({
  position: 'relative',
  m: 0,
  p: { xs: 2, sm: 3 },
  bgcolor: 'common.white',
  color: DOCUMENT_TEXT_COLOR,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '14px',
  outline: dragging ? '2px dashed' : '2px dashed transparent',
  outlineColor: dragging ? 'primary.main' : 'transparent',
  outlineOffset: 3,
});

/** Logo (or trade name) on the left, the document's title and number on the right, as on the PDF. */
export const previewHeaderSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 2,
  minHeight: 64,
};

/** The PDF gives the logo a 156 × 64 pt box and keeps its proportions. */
export const previewLogoSx: SxProps<Theme> = {
  display: 'block',
  maxWidth: { xs: 132, sm: 156 },
  maxHeight: 64,
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
};

export const previewTradeNameSx = (ink: string): SxProps<Theme> => ({
  m: 0,
  maxWidth: '55%',
  fontSize: { xs: 16, sm: 18 },
  fontWeight: 700,
  lineHeight: 1.25,
  color: ink,
  overflowWrap: 'anywhere',
  transition: recolor,
});

export const previewTitleSx = (ink: string): SxProps<Theme> => ({
  m: 0,
  fontSize: { xs: 15, sm: 17 },
  fontWeight: 700,
  letterSpacing: '0.02em',
  lineHeight: 1.2,
  textAlign: 'right',
  color: ink,
  transition: recolor,
});

export const previewNumberSx: SxProps<Theme> = { m: 0, mt: 0.5, fontSize: 11, fontWeight: 600, textAlign: 'right' };

export const previewTableSx: SxProps<Theme> = { mt: 3 };

/** The items table's header band, in the main color with the text the API picks for it. */
export const previewBandSx = ({ accent, onAccent }: DocumentColors): SxProps<Theme> => ({
  display: 'flex',
  justifyContent: 'space-between',
  px: 1.5,
  py: 0.75,
  bgcolor: accent,
  color: onAccent,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.4,
  transition: recolor,
});

/** A sample row; every other one takes the tint, as the PDF's alternate rows do. */
export const previewRowSx = (fill: string): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 3,
  px: 1.5,
  py: 1.25,
  bgcolor: fill,
  transition: recolor,
});

/** A line of text in a sample row: its shape only, so nobody stops to read made-up content. */
export const previewLineSx = (width: string): SxProps<Theme> => ({
  width,
  height: 6,
  borderRadius: 3,
  bgcolor: alpha(DOCUMENT_TEXT_COLOR, 0.14),
});

/** Over the sheet while a file is dragged onto it. */
export const dropHintSx: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  p: 2,
  borderRadius: '13px',
  bgcolor: alpha(DOCUMENT_PAPER_COLOR, 0.9),
  color: DOCUMENT_TEXT_COLOR,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'center',
  pointerEvents: 'none',
};

const note: SystemStyleObject<Theme> = { m: 0, mt: 1, fontSize: 13, lineHeight: 1.4, color: 'text.secondary' };

/** A line under the sheet or a control: what is missing, or what to keep in mind. */
export const brandingNoteSx: SxProps<Theme> = note;

/** The same line when it warns, in the orange the badges use, which reads at least 4.5:1 in both themes. */
export const brandingWarningSx: SxProps<Theme> = { ...note, color: (theme: Theme): string => toneAccent(theme, 'orange') };

/** "Logo", "Color principal": the two groups of controls beside the sheet. */
export const controlTitleSx: SxProps<Theme> = { m: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: 'text.primary' };

export const controlHintSx: SxProps<Theme> = { m: 0, mb: 1.5, fontSize: 13, lineHeight: 1.4, color: 'text.secondary' };

export const controlActionsSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 };

/** The color picker, the hex code and Restablecer on one line, level at the top. */
export const colorRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'flex-start', gap: 1.5 };

/**
 * The browser's own color picker drawn as a swatch as tall as the filled input beside it; its inner
 * radius is the outer one less the padding, so the two corners stay concentric.
 */
export const swatchInputSx: SxProps<Theme> = {
  flexShrink: 0,
  width: 48,
  height: 48,
  m: 0,
  p: '4px',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '10px',
  bgcolor: 'background.paper',
  cursor: 'pointer',
  appearance: 'none',
  '&::-webkit-color-swatch-wrapper': { p: 0 },
  '&::-webkit-color-swatch': { border: 'none', borderRadius: '6px' },
  '&::-moz-color-swatch': { border: 'none', borderRadius: '6px' },
  '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
};

export const hexFieldSx: SxProps<Theme> = { width: 150, flexShrink: 0, '& input': { fontVariantNumeric: 'tabular-nums' } };

export const resetButtonSx: SxProps<Theme> = { mt: 1, flexShrink: 0 };

// The hex field above already keeps a line free for its error, so the label adds only a little more.
export const suggestionsLabelSx: SxProps<Theme> = { m: 0, mt: 0.5, mb: 1, fontSize: 13, fontWeight: 500, color: 'text.secondary' };

export const suggestionsSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', gap: 1 };

/** A color from the logo: a 32 px tile with a hairline inside (white still shows); the chosen one is ringed. */
export const suggestionSx = (color: string, chosen: boolean): SxProps<Theme> => ({
  width: 32,
  height: 32,
  borderRadius: '8px',
  bgcolor: color,
  boxShadow: (theme: Theme): string => `inset 0 0 0 1px ${alpha(theme.palette.common.black, 0.12)}`,
  outline: '2px solid',
  outlineColor: chosen ? 'primary.main' : 'transparent',
  outlineOffset: 2,
  transition: 'outline-color 120ms ease',
  '&:focus-visible': { outlineColor: 'primary.main' },
});
