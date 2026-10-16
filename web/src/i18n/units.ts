import type { Unit } from '../types/api';

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

const isUnit = (unit: string): unit is Unit => Object.hasOwn(UNIT_LABELS, unit);

/** Localizes display labels while keeping the API's unit identifiers intact. */
export const unitLabel = (unit: string, quantity: number = 1): string => {
  if (!isUnit(unit)) return unit;
  const label: string = UNIT_LABELS[unit];
  return Math.abs(quantity) === 1 ? label : (pluralLabels[unit] ?? label);
};
