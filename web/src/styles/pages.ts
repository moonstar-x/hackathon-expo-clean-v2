// Styles of the create, edit and detail pages: a column of cards under the PageHeader.
import type { SxProps, Theme } from '@mui/material/styles';
import { FILTER_CONTROL_HEIGHT } from '../constants/components';
import type { FigureSize } from '../types/components';

/**
 * A form section's grid: its inputs' own margins dropped, so a row's inputs line up top to top, and
 * a switch's line as tall as an input, so it sits level with the inputs beside it.
 */
export const sectionGridSx: SxProps<Theme> = {
  alignItems: 'flex-start',
  '& .MuiFormControl-root': { mt: 0, mb: 0 },
  '& .MuiFormGroup-root > .MuiFormControlLabel-root': { minHeight: FILTER_CONTROL_HEIGHT },
};

/**
 * Key figures: each a label over its value, no boxes, no rules. Columns of a natural width as many as
 * fit (auto-fill, not auto-fit): three figures stay together on the left of a wide card.
 */
export const keyFiguresSx = (size: FigureSize): SxProps<Theme> => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${size === 'small' ? 96 : 180}px), 1fr))`,
  columnGap: size === 'small' ? 2 : 3,
  rowGap: 2,
  m: 0,
});

export const keyFigureLabelSx: SxProps<Theme> = { fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: 'text.secondary' };

export const keyFigureValueSx = (size: FigureSize): SxProps<Theme> => ({
  m: 0,
  mt: 0.25,
  fontSize: size === 'small' ? 16 : 22,
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: size === 'small' ? 0 : '-0.01em',
  color: 'text.primary',
  overflowWrap: 'anywhere',
});

export const keyFigureHintSx: SxProps<Theme> = { m: 0, mt: 0.25, fontSize: 12.5, lineHeight: 1.4, color: 'text.secondary' };

/** A titled card of a detail page; as tall as its row, so cards side by side end level. */
export const showSectionSx: SxProps<Theme> = { height: '100%', display: 'flex', flexDirection: 'column' };

export const showSectionContentSx: SxProps<Theme> = { flex: 1, pt: 0.5 };

/** Labeled fields on as many ~200px columns as fit; the grid's gap spaces them, not their margins. */
export const detailGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
  columnGap: 3,
  rowGap: 2.5,
  '& .RaLabeled-root': { mb: 0, minWidth: 0 },
};

/** A field that needs the whole row of a DetailGrid (a description, notes). */
export const wideFieldSx: SxProps<Theme> = { gridColumn: '1 / -1' };

/**
 * A <Create> or <Edit> page: its card spans the page, and on desktop the form's toolbar stays at the
 * bottom of the screen while a long form scrolls under it, so Save is always in reach. The card clips
 * (overflow: clip, not hidden, which would stop the toolbar sticking) to keep its rounded corners;
 * the toolbar sits above the inputs' floating labels. On phones react-admin pins the toolbar itself.
 */
export const formPageSx: SxProps<Theme> = {
  mb: 3,
  '& .RaCreate-card, & .RaEdit-card': { overflow: 'clip' },
  '& .RaToolbar-desktopToolbar': { position: 'sticky', bottom: 0, zIndex: 2 },
};

/**
 * Save on the left, Delete on the right, on a hairline that closes the card. On phones react-admin
 * pins this bar to the bottom of the screen, where the line marks its edge over the scrolled form.
 */
export const formToolbarSx: SxProps<Theme> = {
  justifyContent: 'space-between',
  gap: 1,
  borderTop: '1px solid',
  borderColor: 'divider',
};

/** A detail page's section cards, on a Grid that spans the page. */
export const detailPageSx: SxProps<Theme> = { pb: 3 };

/** A muted note under a field, such as "Registra un movimiento para modificar las existencias". */
export const fieldNoteSx: SxProps<Theme> = { display: 'block', color: 'text.secondary' };
