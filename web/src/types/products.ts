// Props of the product screens (components/products) and the stock meter.
import type { Unit } from './api';
import type { FigureSize } from './components';

export interface ProductFormProps {
  /** `create` asks for the opening quantity; `edit` shows the stock on hand, which only movements change. */
  mode: 'create' | 'edit';
}

export interface StockMeterProps {
  quantity: number;
  reorderLevel: number;
  unit: Unit;
  /** `medium` names the reorder line under the bar; `small` is for rows that print the numbers beside it. */
  size?: FigureSize;
  /** What the meter measures, for screen readers; "Existencias actuales" by default. */
  label?: string;
}
