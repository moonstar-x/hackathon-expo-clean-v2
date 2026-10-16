import type { Product, StockStatus } from '../types/api';

/** Where a product's stock stands: none left, at or below its reorder level, or fine. */
export const stockStatus = (product: Pick<Product, 'quantity' | 'isLowStock'>): StockStatus => {
  if (product.quantity === 0) return 'outOfStock';
  return product.isLowStock ? 'lowStock' : 'inStock';
};
