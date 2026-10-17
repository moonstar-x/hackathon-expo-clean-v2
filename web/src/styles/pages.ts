// Styles of the create, edit and detail pages: a column of cards under the PageHeader.
import type { SxProps, Theme } from '@mui/material/styles';
import type { FigureSize } from '../types/components';

/** A form section's grid: its inputs' own margins dropped, so a row's inputs line up top to top. */
export const sectionGridSx: SxProps<Theme> = {
  alignItems: 'flex-start',
  '& .MuiFormControl-root': { mt: 0, mb: 0 },
};

/** Key figures: as many columns as fit, each a label over its value; no boxes, no rules. */
export const keyFiguresSx = (size: FigureSize): SxProps<Theme> => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${size === 'small' ? 96 : 160}px), 1fr))`,
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
 * A <Create> or <Edit> page: its card only as wide as the form reads well, never wider than the
 * page. react-admin's own classes, so the page stays a plain <Create>/<Edit>.
 */
export const formPageSx = (maxWidth: number): SxProps<Theme> => ({
  mb: 3,
  '& .RaCreate-main, & .RaEdit-main': { maxWidth },
});

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

/** The cards of a detail page, stacked; wide enough for the stock history table. */
export const detailStackSx: SxProps<Theme> = { pb: 3, maxWidth: 1080 };

/** Room on the summary card's right for its ribbon, so the stats never run under it. */
export const ribbonContentSx: SxProps<Theme> = { pr: { xs: 15, sm: 20 } };

/** A muted note under a field, such as "Registra un movimiento para modificar las existencias". */
export const fieldNoteSx: SxProps<Theme> = { display: 'block', color: 'text.secondary' };

/** The current-stock line sits close under the product input it describes. */
export const currentStockSx: SxProps<Theme> = { mt: -1, mb: 2, color: 'text.secondary' };
