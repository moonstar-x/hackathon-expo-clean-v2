import { describe, expect, it } from 'vitest';
import { contrast, documentColors, isHexColor, normalizeHex } from '../../src/utils/documentColors';
import type { DocumentColors } from '../../src/types/quoteDocuments';

// The same cases as the API's colors test: the preview and the PDF must agree to the digit.
describe('document colors', (): void => {
  it.each<[string, DocumentColors]>([
    ['#4F46E5', { accent: '#4F46E5', onAccent: '#FFFFFF', ink: '#4F46E5', tint: '#EDEDFC' }],
    ['#facc15', { accent: '#FACC15', onAccent: '#0F172A', ink: '#857220', tint: '#FFFAE8' }],
    ['#000000', { accent: '#000000', onAccent: '#FFFFFF', ink: '#000000', tint: '#E6E6E6' }],
    ['#FFFFFF', { accent: '#FFFFFF', onAccent: '#0F172A', ink: '#6F747F', tint: '#FFFFFF' }],
    ['#16A34A', { accent: '#16A34A', onAccent: '#0F172A', ink: '#158744', tint: '#E8F6ED' }],
    ['#38BDF8', { accent: '#38BDF8', onAccent: '#0F172A', ink: '#287BA6', tint: '#EBF8FE' }],
  ])('derives %s exactly as the API does', (input: string, expected: DocumentColors): void => {
    expect(documentColors(input)).toEqual(expected);
  });

  it('keeps headings readable on white and the band text readable on the band', (): void => {
    for (const color of ['#FACC15', '#FFFFFF', '#38BDF8', '#16A34A', '#E11D48', '#0F172A']) {
      const { accent, onAccent, ink }: DocumentColors = documentColors(color);
      expect(contrast(ink, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(onAccent, accent)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('takes a color code as the API stores it', (): void => {
    expect(isHexColor('#4F46E5')).toBe(true);
    for (const value of ['#4f46e5', '#4F46E', '4F46E5', '#GGGGGG', null, 42]) expect(isHexColor(value)).toBe(false);
    expect(normalizeHex(' 4f46e5 ')).toBe('#4F46E5');
    expect(normalizeHex('#e11d48')).toBe('#E11D48');
    expect(normalizeHex('')).toBe('');
  });
});
