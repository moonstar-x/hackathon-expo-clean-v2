import type { Unit } from '../types';

export const UNIT_LABELS: Record<Unit, string> = {
  unit: 'unidad',
  box: 'caja',
  pack: 'paquete',
  roll: 'rollo',
  pair: 'par',
  L: 'L',
  mL: 'mL',
  gal: 'gal',
  kg: 'kg',
  g: 'g',
};

const pluralLabels: Partial<Record<Unit, string>> = {
  unit: 'unidades',
  box: 'cajas',
  pack: 'paquetes',
  roll: 'rollos',
  pair: 'pares',
};

/** Localizes display labels while keeping the API's unit identifiers intact. */
export function unitLabel(unit: string, quantity = 1): string {
  const label = UNIT_LABELS[unit as Unit] ?? unit;
  return Math.abs(quantity) === 1 ? label : pluralLabels[unit as Unit] ?? label;
}
