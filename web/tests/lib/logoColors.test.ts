import { describe, expect, it } from 'vitest';
import { logoColors } from '../../src/utils/logoColors';

/** RGBA pixels: each run is a color and how many pixels of it, as a canvas's ImageData lists them. */
const pixels = (...runs: [[number, number, number, number], number][]): number[] =>
  runs.flatMap(([rgba, count]: [[number, number, number, number], number]): number[] => Array.from({ length: count }, (): number[] => rgba).flat());

describe('logo colors', (): void => {
  it('ranks a logo’s colors by area, leaving its transparent and white background out', (): void => {
    expect(logoColors(pixels([[225, 29, 72, 255], 70], [[37, 99, 235, 255], 25], [[255, 255, 255, 255], 300], [[10, 10, 10, 0], 500]))).toEqual(['#E11D48', '#2563EB']);
  });

  it('offers near shades as one color, the more used one', (): void => {
    expect(logoColors(pixels([[225, 29, 72, 255], 60], [[230, 32, 75, 255], 20]))).toEqual(['#E11D48']);
  });

  it('leaves out a color covering under 2% of the logo, such as soft edges', (): void => {
    expect(logoColors(pixels([[225, 29, 72, 255], 99], [[22, 163, 74, 255], 1]))).toEqual(['#E11D48']);
  });

  it('offers five colors at most, most used first', (): void => {
    const many: number[] = pixels(
      [[200, 0, 0, 255], 70], [[0, 150, 0, 255], 60], [[0, 0, 200, 255], 50], [[0, 0, 0, 255], 40],
      [[120, 0, 120, 255], 30], [[0, 120, 120, 255], 20], [[230, 120, 0, 255], 10],
    );
    expect(logoColors(many)).toEqual(['#C80000', '#009600', '#0000C8', '#000000', '#780078']);
    expect(logoColors(many, 2)).toEqual(['#C80000', '#009600']);
  });

  it('has nothing to offer for a white or empty logo', (): void => {
    expect(logoColors(pixels([[255, 255, 255, 255], 10], [[250, 250, 250, 255], 10]))).toEqual([]);
    expect(logoColors([])).toEqual([]);
  });
});
