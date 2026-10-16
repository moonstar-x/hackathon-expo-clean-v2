import { describe, expect, it } from 'vitest';
import {
  deltaTone,
  formatArea,
  formatCurrency,
  formatDelta,
  formatDimensions,
  formatFileSize,
  formatLength,
  formatQuantity,
  MINUS,
} from '../../src/utils/format';

const L: string = 'en-US';

describe('formatQuantity', () => {
  it('appends the unit', (): void => {
    expect(formatQuantity(12.5, 'L', L)).toBe('12.5 L');
    expect(formatQuantity(3, 'box', L)).toBe('3 cajas');
  });

  it('shows at most 3 decimals', (): void => {
    expect(formatQuantity(0.1 + 0.2, 'kg', L)).toBe('0.3 kg');
    expect(formatQuantity(1.23456, 'L', L)).toBe('1.235 L');
    expect(formatQuantity(2.5, 'L', L)).toBe('2.5 L');
  });

  it('groups thousands and handles missing values', (): void => {
    expect(formatQuantity(1250, 'roll', L)).toBe('1,250 rollos');
    expect(formatQuantity(5, undefined, L)).toBe('5');
    expect(formatQuantity(null, 'L', L)).toBe('');
  });

  it('defaults to Spanish formatting and localizes singular and plural units', (): void => {
    expect(formatQuantity(12.5, 'L')).toBe('12,5 L');
    expect(formatQuantity(1, 'unit')).toBe('1 unidad');
    expect(formatQuantity(2, 'unit')).toBe('2 unidades');
    expect(formatQuantity(1, 'pair')).toBe('1 par');
    expect(formatQuantity(0, 'pair')).toBe('0 pares');
  });
});

describe('formatDelta', () => {
  it('signs positive and negative changes', (): void => {
    expect(formatDelta(10, 'L', L)).toBe('+10 L');
    expect(formatDelta(-3, 'L', L)).toBe(`${MINUS}3 L`);
    expect(formatDelta(-0.125, 'kg', L)).toBe(`${MINUS}0.125 kg`);
  });

  it('shows zero without a sign', (): void => {
    expect(formatDelta(0, 'L', L)).toBe('0 L');
  });

  it('classifies the tone', (): void => {
    expect([deltaTone(2), deltaTone(-2), deltaTone(0)]).toEqual(['positive', 'negative', 'zero']);
  });
});

describe('measurement formatting (SPEC-004 WEB-MEAS-3)', () => {
  it('writes lengths with 2 decimals and areas with 1, in Spanish', (): void => {
    expect(formatLength(3.42)).toBe('3,42 m');
    expect(formatLength(2.5)).toBe('2,50 m');
    expect(formatArea(34)).toBe('34,0 m²');
    expect(formatArea(12.44)).toBe('12,4 m²');
  });

  it('marks approximate areas and dashes unknown values', (): void => {
    expect(formatArea(35.2, true)).toBe('≈ 35,2 m²');
    expect(formatArea(null, true)).toBe('—');
    expect(formatLength(null)).toBe('—');
  });

  it('writes sizes side by side and file sizes in KB or MB', (): void => {
    expect(formatDimensions([2.1, 0.9, 0.85])).toBe('2,10 × 0,90 × 0,85 m');
    expect(formatDimensions([8.5, 4])).toBe('8,50 × 4,00 m');
    expect(formatFileSize(41810)).toBe('40,8 KB');
    expect(formatFileSize(2.3 * 1024 * 1024)).toBe('2,3 MB');
    expect(formatFileSize(1536, L)).toBe('1.5 KB');
  });
});

describe('formatCurrency', () => {
  it('formats money in the configured currency', (): void => {
    expect(formatCurrency(1234.5, 'USD', L)).toBe('$1,234.50');
    expect(formatCurrency(54, 'EUR', L)).toBe('€54.00');
    expect(formatCurrency(undefined, 'USD', L)).toBe('');
    expect(formatCurrency(1234.5, 'USD')).toBe(
      new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(1234.5),
    );
  });
});
