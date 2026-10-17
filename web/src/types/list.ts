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

/**
 * Where an empty state sits: `page` stands alone in its own card (a List's `empty`), `inline` fills
 * a list's card (a DataTable's or SimpleList's `empty`), `compact` fits a dashboard panel.
 */
export type EmptyStateVariant = 'page' | 'inline' | 'compact';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  /** Whose icon and copy (`app.empty.<resource>`) to show; the surrounding resource by default. */
  resource?: string;
  /** Replaces the create button; `false` shows no action. */
  action?: ReactNode | false;
  /** Translation keys of the steps that fill this list, for empty states that teach a sequence. */
  steps?: string[];
  /** Replaces the resource's icon. */
  icon?: SvgIconComponent;
  /** Translation key prefix replacing `app.empty.<resource>`, for an empty state of its own. */
  messages?: string;
  /**
   * The list's own default filters (Productos shows active ones): with only these set the list
   * counts as unfiltered, and clearing the filters goes back to them.
   */
  defaultFilters?: Record<string, unknown>;
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
