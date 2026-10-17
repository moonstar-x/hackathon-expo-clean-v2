// Values used by the shared components in src/components.
import type { PopoverOrigin } from '@mui/material/Popover';
import type { MovementType, StockStatus } from '../types/api';
import type { StatusColor } from '../types/components';
import type { Tone } from '../types/list';

/** Shown where a value is missing. */
export const NONE: string = '—';

/** Rows-per-page choices of every desktop list; all within the API's 1000-row page. */
export const ROWS_PER_PAGE: number[] = [10, 25, 50, 100];

/** Height of every control in a list's filter bar: a small filled input with its label and border. */
export const FILTER_CONTROL_HEIGHT: number = 50;

/** Badge tone per stock status, shared by desktop tables and mobile rows (SPEC-002 §7.2). */
export const STOCK_STATUS_TONE: Record<StockStatus, Tone> = {
  outOfStock: 'red',
  lowStock: 'orange',
  inStock: 'green',
};

/** Palette color per stock status: the stock meter's fill (red empty, orange at the reorder line or below). */
export const STOCK_STATUS_COLOR: Record<StockStatus, StatusColor> = {
  outOfStock: 'error',
  lowStock: 'warning',
  inStock: 'success',
};

/** Palette color per movement type, for the tile behind its icon in the dashboard feed. */
export const MOVEMENT_TYPE_COLOR: Record<MovementType, StatusColor> = {
  IN: 'success',
  OUT: 'error',
  ADJUSTMENT: 'info',
};

/** Badge tone per movement type: IN green, OUT red, ADJUSTMENT blue (SPEC-002 §7.3). */
export const MOVEMENT_TYPE_TONE: Record<MovementType, Tone> = {
  IN: 'green',
  OUT: 'red',
  ADJUSTMENT: 'blue',
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
