import { describe, expect, it } from 'vitest';
import { deltaTone, formatCurrency, formatDateTime, formatDelta, formatQuantity, MINUS } from './format';

const L = 'en-US';

describe('formatQuantity', () => {
  it('appends the unit', () => {
    expect(formatQuantity(12.5, 'L', L)).toBe('12.5 L');
    expect(formatQuantity(3, 'box', L)).toBe('3 box');
  });

  it('shows at most 3 decimals', () => {
    expect(formatQuantity(0.1 + 0.2, 'kg', L)).toBe('0.3 kg');
    expect(formatQuantity(1.23456, 'L', L)).toBe('1.235 L');
    expect(formatQuantity(2.5, 'L', L)).toBe('2.5 L');
  });

  it('groups thousands and handles missing values', () => {
    expect(formatQuantity(1250, 'roll', L)).toBe('1,250 roll');
    expect(formatQuantity(5, undefined, L)).toBe('5');
    expect(formatQuantity(null, 'L', L)).toBe('');
  });
});

describe('formatDelta', () => {
  it('signs positive and negative changes', () => {
    expect(formatDelta(10, 'L', L)).toBe('+10 L');
    expect(formatDelta(-3, 'L', L)).toBe(`${MINUS}3 L`);
    expect(formatDelta(-0.125, 'kg', L)).toBe(`${MINUS}0.125 kg`);
  });

  it('shows zero without a sign', () => {
    expect(formatDelta(0, 'L', L)).toBe('0 L');
  });

  it('classifies the tone', () => {
    expect([deltaTone(2), deltaTone(-2), deltaTone(0)]).toEqual(['positive', 'negative', 'zero']);
  });
});

describe('formatCurrency', () => {
  it('formats money in the configured currency', () => {
    expect(formatCurrency(1234.5, 'USD', L)).toBe('$1,234.50');
    expect(formatCurrency(54, 'EUR', L)).toBe('€54.00');
    expect(formatCurrency(undefined, 'USD', L)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO timestamp and ignores bad input', () => {
    expect(formatDateTime('2026-10-16T14:03:11.512Z', L)).toMatch(/2026/);
    expect(formatDateTime('nope', L)).toBe('');
    expect(formatDateTime(null, L)).toBe('');
  });
});
