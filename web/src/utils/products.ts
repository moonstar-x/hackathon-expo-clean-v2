import type { MovementType, Product, StockStatus } from '../types/api';

/** Where a product's stock stands: none left, at or below its reorder level, or fine. */
export const stockStatus = (product: Pick<Product, 'quantity' | 'isLowStock'>): StockStatus => {
  if (product.quantity === 0) return 'outOfStock';
  return product.isLowStock ? 'lowStock' : 'inStock';
};

/**
 * The full scale of a stock meter: twice the reorder level, so the reorder line sits at most halfway
 * along, or the stock itself when there is more; never 0.
 */
export const meterScale = (quantity: number, reorderLevel: number): number => Math.max(reorderLevel * 2, quantity, 1);

/** The stock a movement leaves: an entrada adds, a salida takes away, an ajuste sets the count. */
export const stockAfter = (quantity: number, type: MovementType, amount: number): number => {
  if (type === 'IN') return quantity + amount;
  if (type === 'OUT') return quantity - amount;
  return amount;
};
