import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import type { Product } from '../types/api';

/**
 * Low-stock rows get a light tint of the warning colour, readable on light and dark paper (SPEC-002
 * §7.2). It takes the theme rather than reading it in an sx callback: DataTable's and SimpleList's
 * rowSx are typed without one.
 */
export const lowStockRowSx = (theme: Theme, record: Product): SxProps =>
  record.isLowStock ? { backgroundColor: alpha(theme.palette.warning.main, 0.08) } : {};
