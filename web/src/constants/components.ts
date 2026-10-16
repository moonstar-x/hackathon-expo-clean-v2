// Values used by the shared components in src/components.
import type { PopoverOrigin } from '@mui/material/Popover';
import type { MovementType, StockStatus } from '../types/api';
import type { RibbonColor, RibbonSize, RibbonSizeConfig } from '../types/components';
import type { Tone } from '../types/list';

/** Shown where a value is missing. */
export const NONE: string = '—';

/** Rows-per-page choices of every desktop list; all within the API's 1000-row page. */
export const ROWS_PER_PAGE: number[] = [10, 25, 50, 100];

export const RIBBON_SIZES: Record<RibbonSize, RibbonSizeConfig> = {
  small: { py: '4px', px: '10px', fontSize: '0.75rem', fold: 8 },
  medium: { py: '6px', px: '16px', fontSize: '0.875rem', fold: 10 },
  large: { py: '8px', px: '20px', fontSize: '1rem', fold: 12 },
};

export const PALETTE_COLORS: ReadonlySet<RibbonColor> = new Set<RibbonColor>([
  'primary',
  'secondary',
  'error',
  'warning',
  'info',
  'success',
]);

/** Badge tone per stock status, shared by desktop tables and mobile rows (SPEC-002 §7.2). */
export const STOCK_STATUS_TONE: Record<StockStatus, Tone> = {
  outOfStock: 'red',
  lowStock: 'orange',
  inStock: 'green',
};

/** Ribbon color per stock status, for the product detail card. */
export const STOCK_STATUS_RIBBON: Record<StockStatus, RibbonColor> = {
  outOfStock: 'error',
  lowStock: 'warning',
  inStock: 'success',
};

/** Badge tone per movement type: IN green, OUT red, ADJUSTMENT blue (SPEC-002 §7.3). */
export const MOVEMENT_TYPE_TONE: Record<MovementType, Tone> = {
  IN: 'green',
  OUT: 'red',
  ADJUSTMENT: 'blue',
};

/** Ribbon color per movement type, for the movement detail card. */
export const MOVEMENT_TYPE_RIBBON: Record<MovementType, RibbonColor> = {
  IN: 'success',
  OUT: 'error',
  ADJUSTMENT: 'info',
};

/** The user menu hangs from the right edge of its trigger. */
export const USER_MENU_ID: string = 'menu-appbar';
export const USER_MENU_ANCHOR: PopoverOrigin = { vertical: 'bottom', horizontal: 'right' };
export const USER_MENU_TRANSFORM: PopoverOrigin = { vertical: 'top', horizontal: 'right' };

/** Speed of a long title sliding across the phone AppBar, in px/s while moving. */
export const MARQUEE_SPEED: number = 45;

/** Widest a create or edit form grows; wider lines of inputs get hard to scan. */
export const FORM_MAX_WIDTH: number = 640;

/** The product form lays its sections out in two columns from `md`, so it gets more room. */
export const WIDE_FORM_MAX_WIDTH: number = 960;
