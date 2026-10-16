import type { MovementType } from '../../types';

export const MOVEMENT_TYPE_CHOICES: { id: MovementType; name: string }[] = [
  { id: 'IN', name: 'Entrada' },
  { id: 'OUT', name: 'Salida' },
  { id: 'ADJUSTMENT', name: 'Ajuste de inventario' },
];

export const QUANTITY_LABELS: Record<MovementType, { label: string; helperText: string }> = {
  IN: { label: 'Cantidad recibida', helperText: 'Cantidad que se añade al inventario' },
  OUT: { label: 'Cantidad consumida', helperText: 'Cantidad utilizada, consumida o desechada' },
  ADJUSTMENT: { label: 'Cantidad contada', helperText: 'Las existencias se ajustan a este recuento físico' },
};
