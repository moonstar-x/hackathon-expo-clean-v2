// Types of the shared list kit (components/list), used by every mobile and desktop list.
import type { ReactElement, ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

export type Tone = 'brand' | 'orange' | 'blue' | 'red' | 'green' | 'neutral';

export interface OutlinedBadgeProps {
  label: ReactNode;
  icon?: ReactElement;
  tone?: Tone;
  /** Smaller badge for tight rows. */
  dense?: boolean;
}

export interface ListRowOptions {
  /** Top-align a leftAvatar with the title. */
  avatar?: boolean;
  /** Rows that don't navigate get no pointer or hover. */
  clickable?: boolean;
}

export interface MetaRowProps {
  icon?: SvgIconComponent;
  children: ReactNode;
}

export interface PrimaryRowProps {
  children: ReactNode;
  /** Badge or action on the right of the title. */
  end?: ReactNode;
}

export interface StatItem {
  label: string;
  value: ReactNode;
}

export interface StatBarProps {
  items: StatItem[];
}

export interface ListTotalProps {
  /** Translation key with a smart_count plural, such as "1 producto |||| %{smart_count} productos". */
  message: string;
}

export interface ResultsToolbarProps {
  /** Translation key for the result count shown on the left (see ListTotalProps). */
  total: string;
  /** Keep react-admin's buttons as icons up to `md`, for the card layout (see compactActionsTheme). */
  compact?: boolean;
  /** The list's actions, shown on the right. */
  children: ReactNode;
}
