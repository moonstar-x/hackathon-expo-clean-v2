// Props of the shared components in src/components.
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { BoxProps } from '@mui/material/Box';
import type { IconButtonProps } from '@mui/material/IconButton';
import type { ButtonProps } from 'react-admin';

export interface ResponsiveSwitchProps {
  mobile: ReactElement;
  desktop: ReactElement;
}

export type RibbonColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
export type RibbonSize = 'small' | 'medium' | 'large';
export type RibbonVariant = 'filled' | 'outlined';
export type RibbonSide = 'left' | 'right';

export interface RibbonSizeConfig {
  py: string;
  px: string;
  fontSize: string;
  fold: number;
}

export interface RibbonColors {
  main: string;
  dark: string;
  contrastText: string;
}

export interface RibbonProps extends Omit<BoxProps, 'color'> {
  children: ReactNode;
  /** A palette key (primary, success, warning…) or any CSS color. */
  color?: string;
  size?: RibbonSize;
  variant?: RibbonVariant;
  /** The card edge the ribbon hangs from. */
  side?: RibbonSide;
}

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Dialog title; a translation key or text. */
  confirmTitle?: string;
  /** What the action does; a translation key, text or element. */
  confirmContent: ReactNode;
  /** Runs once the user confirms; an error it throws is shown as a notification. */
  onConfirm: () => Promise<void> | void;
}

export interface PageHeaderProps {
  /** Small uppercase line above the title: the menu section, or the kind of record. */
  eyebrow: ReactNode;
  title: ReactNode;
  /** Shown beside the title, e.g. a status badge. */
  badge?: ReactNode;
  /** Buttons and links shown under the title (they wrap on narrow screens). */
  actions?: ReactNode;
}

export interface SectionProps {
  title: ReactNode;
  children: ReactNode;
  /** Muted line under the title. */
  hint?: ReactNode;
  /** Button or link aligned with the title. */
  action?: ReactNode;
}

/** A palette color that carries a status: a stock level, a movement type. */
export type StatusColor = 'success' | 'warning' | 'error' | 'info';

/** `small` for narrow cards (a room) and list rows; `medium` for a page's summary. */
export type FigureSize = 'medium' | 'small';

export interface KeyFigure {
  /** Already translated. */
  label: string;
  value: ReactNode;
  /** Muted line under the value. */
  hint?: ReactNode;
}

export interface KeyFiguresProps {
  items: KeyFigure[];
  size?: FigureSize;
}

export interface ShowSectionProps {
  title: ReactNode;
  children: ReactNode;
  /** Button or link at the right of the title. */
  action?: ReactNode;
}

export interface ExpandMoreProps extends Omit<IconButtonProps, 'children'> {
  expand: boolean;
}

/** Props an ActionsMenu child receives, so it can close the menu once it acts. */
export interface ActionsMenuItemProps {
  handleClose?: () => void;
}

export interface ActionsMenuProps {
  /** Button label; a translation key or text. */
  label: string;
  children: ReactNode;
}

export interface CopyFieldWrapperProps {
  /** Record path to copy, dot-separated for nested values. */
  source: string;
  /** Field label; a translation key or text. */
  label?: string;
  /** The react-admin field that displays the value (TextField by default). */
  field?: ComponentType<{ source: string }>;
}

export interface QuickFilterProps {
  /** Filter key; react-admin reads it (and `defaultValue`) off the element. */
  source: string;
  /** Chip label; a translation key or text. */
  label: string;
  defaultValue?: unknown;
  alwaysOn?: boolean;
  /** Source of a filter that cannot be on at the same time; adding this one removes that one. */
  excludes?: string;
}

export interface FormToolbarProps {
  /** Adds a Delete button (pessimistic, with a confirmation) on the right. */
  withDelete?: boolean;
}

export interface FormHeaderProps {
  /**
   * Translation key of the line above the title. Create pages pass their menu section; edit pages
   * default to "Editar <recurso>".
   */
  eyebrow?: string;
  /** Translation key that replaces the controller's title (e.g. "Registrar movimiento de inventario"). */
  title?: string;
  /** Buttons under the title, e.g. a link to the record's detail page. */
  actions?: ReactNode;
}

export interface ChildrenProps {
  children: ReactNode;
}

/** A choice of a SelectInput or RadioButtonGroupInput. */
export interface Choice<Id extends string = string> {
  id: Id;
  name: string;
}

export interface LabelProps {
  /** A translation key or text. */
  label: string;
}
