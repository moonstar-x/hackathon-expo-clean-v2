import type { ReactNode } from 'react';

export type StatCardColor = 'primary' | 'warning' | 'error' | 'success';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  color?: StatCardColor;
  /** When set, the whole card links here. */
  to?: string;
  hint?: string;
}

/** A sort react-admin reads from a list URL. */
export interface ListLinkSort {
  field: string;
  order: 'ASC' | 'DESC';
}
