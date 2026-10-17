import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { STOCK_METER_HEIGHT } from '../constants/products';
import type { Product } from '../types/api';
import type { FigureSize, StatusColor } from '../types/components';

/** The meter and, under it, the legend of its reorder line. */
export const stockMeterSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 };

/** The track: a light step of the status colour, so the state reads across the whole bar. */
export const stockMeterTrackSx = (color: StatusColor, size: FigureSize): SxProps<Theme> => ({
  position: 'relative',
  height: STOCK_METER_HEIGHT[size],
  borderRadius: 999,
  bgcolor: (theme: Theme): string => alpha(theme.palette[color].main, 0.16),
});

/** The stock on hand; a sliver stays visible however little is left. */
export const stockMeterFillSx = (color: StatusColor, ratio: number): SxProps<Theme> => ({
  height: '100%',
  width: `${Math.min(ratio, 1) * 100}%`,
  minWidth: ratio > 0 ? 6 : 0,
  borderRadius: 'inherit',
  bgcolor: `${color}.main`,
  transition: 'width 200ms cubic-bezier(0.23, 1, 0.32, 1)',
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
});

/** The reorder line: a tick standing a little proud of the track. */
export const stockMeterTickSx = (ratio: number): SxProps<Theme> => ({
  position: 'absolute',
  top: -3,
  bottom: -3,
  left: `calc(${Math.min(ratio, 1) * 100}% - 1px)`,
  width: 2,
  borderRadius: 1,
  bgcolor: 'text.secondary',
});

export const stockMeterLegendSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' };

/** The tick again, small, so the legend points at the line it names. */
export const stockMeterLegendTickSx: SxProps<Theme> = { width: 2, height: 10, borderRadius: 1, bgcolor: 'text.secondary', flexShrink: 0 };

/**
 * Low-stock rows get a light tint of the warning colour, readable on light and dark paper (SPEC-002
 * §7.2). It takes the theme rather than reading it in an sx callback: DataTable's and SimpleList's
 * rowSx are typed without one.
 */
export const lowStockRowSx = (theme: Theme, record: Product): SxProps =>
  record.isLowStock ? { backgroundColor: alpha(theme.palette.warning.main, 0.08) } : {};

/** The product's stock section: the stock and its meter beside the numbers behind it, stacked on phones. */
export const stockSummarySx: SxProps<Theme> = {
  display: 'grid',
  gap: { xs: 3, md: 5 },
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
  alignItems: 'start',
};

/** The stock on hand, the figure the page is opened for. */
export const stockFigureSx: SxProps<Theme> = { fontSize: 30, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', mt: 0.25, mb: 1.5 };

/** The movement form's preview panel: a quiet tinted panel beside the inputs. */
export const movementPreviewSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2.5,
  p: 2.5,
  mt: 1,
  borderRadius: '12px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: (theme: Theme): string => alpha(theme.palette.text.primary, 0.025),
};

/** One state of the preview: its label, the quantity, and its meter. */
export const previewLineSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column' };

export const previewFigureSx: SxProps<Theme> = { fontSize: 22, fontWeight: 600, lineHeight: 1.25, mt: 0.25, mb: 1.25 };
