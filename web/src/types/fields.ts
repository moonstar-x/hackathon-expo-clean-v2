// Props of the inventory fields and badges (components/fields) and the movement shortcut.
import type { ReactElement } from 'react';
import type { FieldProps } from 'react-admin';
import type { MovementType } from './api';

/** A field bound to one numeric or text source of the record. */
export type SourceFieldProps = FieldProps & { source: string };

/** Fields that render the whole record rather than one source. */
export type RecordFieldProps = Partial<FieldProps>;

export interface MovementQuantityFieldProps extends SourceFieldProps {
  /** Show the value with its sign and colored by direction (a delta). */
  signed?: boolean;
}

export interface BadgeProps extends RecordFieldProps {
  /** Smaller badge for tight rows. */
  dense?: boolean;
}

export interface QuantityLabel {
  label: string;
  helperText: string;
}

export interface MovementPreset {
  label: string;
  icon: ReactElement;
}

export interface MovementButtonProps {
  productId: number;
  type: MovementType;
  label?: string;
  variant?: 'text' | 'outlined' | 'contained';
}

export interface MovementSecondaryProps {
  /** Lead with when it happened, for lists whose rows are titled by product. */
  withDate?: boolean;
}
