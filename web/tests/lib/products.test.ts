import { describe, expect, it } from 'vitest';
import { stockStatus } from '../../src/utils/products';

describe('stockStatus', () => {
  it('is out of stock at zero, low at or under the reorder level, and fine above it', (): void => {
    expect(stockStatus({ quantity: 0, isLowStock: true })).toBe('outOfStock');
    expect(stockStatus({ quantity: 3, isLowStock: true })).toBe('lowStock');
    expect(stockStatus({ quantity: 30, isLowStock: false })).toBe('inStock');
  });
});
