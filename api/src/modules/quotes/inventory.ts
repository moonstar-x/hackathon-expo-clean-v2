/** Count units already mean containers; volume/mass links must retain their kind. */
export function compatibleInventoryUnit(inventoryUnit: string, quotingUnit: string): boolean {
  return ['unit','box','pack','roll','pair'].includes(inventoryUnit)
    || (quotingUnit === 'L' && ['L','mL','gal'].includes(inventoryUnit))
    || (quotingUnit === 'kg' && ['kg','g'].includes(inventoryUnit));
}
