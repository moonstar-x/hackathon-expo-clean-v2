import { describe, expect, it } from 'vitest';
import { decomposeColor, getContrastRatio, type Theme } from '@mui/material/styles';
import { toneAccent } from '../../src/styles/list';
import { darkTheme, lightTheme } from '../../src/theme';
import type { Tone } from '../../src/types/list';

const TONES: Tone[] = ['brand', 'orange', 'blue', 'red', 'green', 'neutral'];

/** A translucent colour as it shows over the paper; getContrastRatio would ignore its alpha. */
const overPaper = (color: string, paper: string): string => {
  const { values } = decomposeColor(color);
  const alpha: number = values.length > 3 ? (values[3] ?? 1) : 1;
  const base: number[] = decomposeColor(paper).values.slice(0, 3);
  const mixed: number[] = values.slice(0, 3).map((channel: number, index: number): number =>
    Math.round(channel * alpha + (base[index] ?? 0) * (1 - alpha)),
  );
  return `rgb(${mixed.join(', ')})`;
};

describe('badge tones', () => {
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('read at least 4.5:1 on the %s paper, small labels included', (_mode: string, theme: Theme): void => {
    const paper: string = theme.palette.background.paper;
    for (const tone of TONES) {
      expect(getContrastRatio(overPaper(toneAccent(theme, tone), paper), paper), tone).toBeGreaterThanOrEqual(4.5);
    }
  });
});
