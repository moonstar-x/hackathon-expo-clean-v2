import type { ReactElement, ReactNode } from 'react';
import type { Product, StockMovement } from './api';

export type StatCardColor = 'primary' | 'warning' | 'error' | 'success';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  color?: StatCardColor;
  /** The whole card links here. */
  to: string;
  /** Muted line under the value; every card has one, so all four share one shape. */
  hint: ReactNode;
}

export interface DashboardPanelProps {
  /** Already translated. */
  title: string;
  /** Where "Ver todos" goes: the full list, filtered like the panel. */
  seeAllTo: string;
  isPending: boolean;
  /** Translated message shown in place of the rows when the request failed. */
  error?: string;
  isEmpty: boolean;
  /** Shown in place of the rows when there are none. */
  empty: ReactElement;
  /** The rows, as list items. */
  children: ReactNode;
}

export interface RestockRowProps {
  product: Product;
}

export interface ActivityRowProps {
  movement: StockMovement;
}

/** A sort react-admin reads from a list URL. */
export interface ListLinkSort {
  field: string;
  order: 'ASC' | 'DESC';
}
