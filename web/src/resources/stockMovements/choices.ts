import type { MovementType } from '../../types';

export const MOVEMENT_TYPE_CHOICES: { id: MovementType; name: string }[] = [
  { id: 'IN', name: 'Receive (IN)' },
  { id: 'OUT', name: 'Use (OUT)' },
  { id: 'ADJUSTMENT', name: 'Count adjustment' },
];

export const QUANTITY_LABELS: Record<MovementType, { label: string; helperText: string }> = {
  IN: { label: 'Quantity received', helperText: 'Amount added to stock' },
  OUT: { label: 'Quantity used', helperText: 'Amount used, consumed or discarded' },
  ADJUSTMENT: { label: 'Counted quantity on hand', helperText: 'Stock is set to this physical count' },
};
