// Styles of the measurement screens (components/measurements). The plan and the 3D model are what a
// measurement page is for, so each gets a framed stage of its own: the plan on white paper, the model
// on the page's background. The list's thumbnails are the same paper, small.
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { FLOOR_OPACITY, THUMBNAIL_SIZE, VIEWER_MIN_HEIGHT } from '../constants/measurements';

/** The phone draws plans for white paper, so plans and thumbnails stay on white in dark mode too (WEB-PLAN-1). */
const paper: SystemStyleObject<Theme> = { bgcolor: 'common.white', border: '1px solid', borderColor: 'divider' };

const tile: SystemStyleObject<Theme> = { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, flexShrink: 0, borderRadius: '8px' };

/** A stage's frame: rounded like Paper, with a hairline. */
const frame: SystemStyleObject<Theme> = { borderRadius: '12px', border: '1px solid', borderColor: 'divider' };

export const thumbnailSx: SxProps<Theme> = {
  ...tile,
  ...paper,
  display: 'block',
  p: '3px',
  boxSizing: 'border-box',
  objectFit: 'contain',
};

/** The same tile, muted, for a measurement without a thumbnail or with one that didn't load. */
export const thumbnailPlaceholderSx: SxProps<Theme> = {
  ...tile,
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'action.hover',
  color: 'text.disabled',
};

/** A phone row's thumbnail, top-aligned with the name beside it. */
export const thumbnailRowSx: SxProps<Theme> = { '& .MuiListItemIcon-root': { minWidth: 0, mr: 1.75, mt: 0.25 } };

export const emptyListSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 };

export const emptyIconSx: SxProps<Theme> = { ...tile, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', mb: 1 };

/** Notes keep the line breaks they were written with. */
export const notesSx: SxProps<Theme> = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '72ch' };

/**
 * The tabs card: tab headers in line with the content, and each tab's content full width.
 * <TabbedShowLayout.Tab> wraps every child in an inline-flex <Labeled>, which would shrink it to fit.
 */
export const measurementTabsSx: SxProps<Theme> = {
  '& .MuiTabs-root': { px: { xs: 0.5, sm: 1.5 } },
  '& .RaTabbedShowLayout-content': { p: { xs: 2, sm: 3 } },
  '& .RaTabbedShowLayout-content .ra-field': { display: 'flex', width: '100%', mb: 0 },
};

/** The actions above a plan or a model. */
export const stageToolbarSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 };

/** The plan on its sheet; it links to the full-size image. */
export const planSheetSx: SxProps<Theme> = {
  ...paper,
  ...frame,
  display: 'block',
  p: { xs: 1, sm: 2 },
  cursor: 'zoom-in',
};

/** As wide as the tab, and never taller than most of the screen. */
export const planImageSx: SxProps<Theme> = { display: 'block', width: '100%', maxHeight: '75vh', objectFit: 'contain' };

/** Where the plan will be while it loads. */
export const planLoadingSx: SxProps<Theme> = { borderRadius: '12px', height: { xs: 280, sm: 440 } };

/**
 * The model's stage: at least 420px tall, most of the screen from `md` (WEB-3D-3). The canvas is
 * laid over it rather than in it: a canvas has a size of its own (300px, doubled on retina screens
 * before the first resize), and in the flow it would hold the page open wider than a phone.
 */
export const viewerStageSx: SxProps<Theme> = {
  ...frame,
  position: 'relative',
  height: { xs: VIEWER_MIN_HEIGHT, md: '60vh' },
  minHeight: VIEWER_MIN_HEIGHT,
  bgcolor: 'background.default',
  overflow: 'hidden',
  cursor: 'grab',
  '&:active': { cursor: 'grabbing' },
  '& canvas': { position: 'absolute', inset: 0, display: 'block' },
};

/** The empty stage, with a spinner in the middle, while the model loads. */
export const viewerLoadingSx: SxProps<Theme> = {
  ...frame,
  display: 'grid',
  placeItems: 'center',
  height: { xs: VIEWER_MIN_HEIGHT, md: '60vh' },
  minHeight: VIEWER_MIN_HEIGHT,
  bgcolor: 'background.default',
};

/** Under the model: which floor color is which room, and how to move the camera. */
export const stageCaptionSx: SxProps<Theme> = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: 3,
  rowGap: 1,
  mt: 1.5,
};

export const legendSx: SxProps<Theme> = { display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, m: 0, p: 0, listStyle: 'none' };

export const legendItemSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13 };

/** A room's floor color, as translucent as the floor in the model. */
export const legendSwatchSx = (color: string): SxProps<Theme> => ({
  width: 12,
  height: 12,
  flexShrink: 0,
  borderRadius: '3px',
  bgcolor: color,
  opacity: FLOOR_OPACITY,
});

/** The furniture toggle, as tall as the outlined button beside it. */
export const toggleButtonSx: SxProps<Theme> = { gap: 1, px: 1.75, py: '5px', fontSize: '0.875rem', lineHeight: 1.75 };

/** Room cards side by side while each gets at least 340px; one per row on phones. */
export const roomGridSx: SxProps<Theme> = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
  alignItems: 'start',
};

export const roomCardSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, p: 2, pb: 0.5 };

/** A room part: a row on a hairline that opens into its table. Rows without anything to list stay closed. */
export const roomPartSx: SxProps<Theme> = {
  bgcolor: 'transparent',
  borderTop: '1px solid',
  borderColor: 'divider',
  '&::before': { display: 'none' },
  '&.Mui-disabled': { bgcolor: 'transparent' },
  '& .MuiAccordionSummary-root': { px: 0, minHeight: 44 },
  '& .MuiAccordionSummary-root.Mui-disabled': { opacity: 1, color: 'text.secondary' },
  '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1 },
  '& .MuiAccordionDetails-root': { px: 0, pt: 0, pb: 1.5 },
};

export const roomPartCountSx: SxProps<Theme> = { ml: 'auto', fontWeight: 600, color: 'text.secondary' };

/** A part's table: flush with the card, sizes on the right. */
export const roomPartTableSx: SxProps<Theme> = {
  '& .MuiTableCell-root': { px: 0 },
  '& .MuiTableCell-root:last-of-type': { pl: 2, textAlign: 'right', whiteSpace: 'nowrap' },
};

export const fileListSx: SxProps<Theme> = { m: 0, p: 0, listStyle: 'none' };

export const fileRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  py: 1.5,
  '& + &': { borderTop: '1px solid', borderColor: 'divider' },
};

export const fileIconSx: SxProps<Theme> = {
  width: 40,
  height: 40,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '10px',
  bgcolor: 'action.hover',
  color: 'text.secondary',
};
