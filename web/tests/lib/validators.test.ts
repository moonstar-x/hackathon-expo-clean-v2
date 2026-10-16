import { describe, expect, it } from 'vitest';
import { emptyToNull, httpUrl, maxDecimals } from '../../src/utils/validators';

describe('validators', () => {
  it('maxDecimals', (): void => {
    expect(maxDecimals(3)(1.125)).toBeUndefined();
    expect(maxDecimals(3)(1.1255)).toBe('Como máximo 3 decimales');
    expect(maxDecimals(4)(0.1234)).toBeUndefined();
    expect(maxDecimals(3)(null)).toBeUndefined();
  });

  it('httpUrl', (): void => {
    expect(httpUrl('https://example.com/sds.pdf')).toBeUndefined();
    expect(httpUrl('')).toBeUndefined();
    expect(httpUrl('ftp://example.com')).toBeDefined();
    expect(httpUrl('nope')).toBeDefined();
  });

  it('emptyToNull', (): void => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('x')).toBe('x');
    expect(emptyToNull(3)).toBe(3);
  });
});
