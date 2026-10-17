import { describe, expect, it } from 'vitest';
import { meterScale, stockAfter, stockStatus } from '../../src/utils/products';

describe('stockStatus', () => {
  it('is out of stock at zero, low at or under the reorder level, and fine above it', (): void => {
    expect(stockStatus({ quantity: 0, isLowStock: true })).toBe('outOfStock');
    expect(stockStatus({ quantity: 3, isLowStock: true })).toBe('lowStock');
    expect(stockStatus({ quantity: 30, isLowStock: false })).toBe('inStock');
  });
});

describe('meterScale', () => {
  it('spans twice the reorder level, or the stock when there is more, and is never 0', (): void => {
    expect(meterScale(3, 4)).toBe(8);
    expect(meterScale(50, 4)).toBe(50);
    expect(meterScale(0, 0)).toBe(1);
  });
});

describe('stockAfter', () => {
  it('adds an entrada, takes away a salida and sets the count of an ajuste', (): void => {
    expect(stockAfter(3, 'IN', 10)).toBe(13);
    expect(stockAfter(3, 'OUT', 2)).toBe(1);
    expect(stockAfter(3, 'OUT', 5)).toBe(-2);
    expect(stockAfter(3, 'ADJUSTMENT', 7)).toBe(7);
  });
});
