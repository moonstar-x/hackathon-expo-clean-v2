import type { SortPayload } from 'react-admin';
import type { Unit } from '../types/api';
import type { FigureSize } from '../types/components';

/** Thickness of the stock meter's bar, in px. */
export const STOCK_METER_HEIGHT: Record<FigureSize, number> = { medium: 10, small: 6 };

/** Every unit the API accepts (SPEC-002 §5). */
export const UNITS: Unit[] = ['unit', 'box', 'pack', 'roll', 'pair', 'L', 'mL', 'gal', 'kg', 'g'];

export const PRODUCT_SORT: SortPayload = { field: 'name', order: 'ASC' };
export const PRODUCT_PER_PAGE: number = 25;

/** Archived products stay out of the list until someone asks for them. */
export const PRODUCT_DEFAULT_FILTER: Record<string, unknown> = { active: true };

/** Fields the API can sort products by that the phone list offers (api/src/modules/products). */
export const PRODUCT_SORT_FIELDS: string[] = ['name', 'sku', 'quantity', 'stockValue', 'updatedAt'];

/** SKUs are letters, digits, ".", "_" and "-" (SPEC-002 §5). */
export const SKU_PATTERN: RegExp = /^[A-Za-z0-9._-]+$/;
