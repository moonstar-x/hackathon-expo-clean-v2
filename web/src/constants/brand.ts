import type { BrandColors, StackedLogo } from '../types/theme';

/** CleanCode brand colors (see design.md). Sky is only used on dark surfaces. */
export const BRAND: BrandColors = {
  navy: '#0F172A',
  navyDeep: '#0A1022',
  indigo: '#4F46E5',
  indigoDeep: '#312E81',
  sky: '#38BDF8',
  white: '#FFFFFF',
  mist: '#EEF2FF',
  slate: '#CBD5E1',
};

/**
 * Height of the horizontal logo in the AppBar. Below design.md's 200px minimum width on purpose:
 * at that size it outweighed everything else in the bar.
 */
export const LOGO_HEIGHT: number = 32;

/** The initials tile beside the user menu. */
export const AVATAR_SIZE: number = 28;

/**
 * Width of a clock digit, in em. Poppins has no tabular figures and its widest digit ("4") is
 * 0.66em at weight 600. `1ch` can't stand in: with the font split into per-language files the
 * browser can't measure its "0" and falls back to 0.5em, so digits overflowed into the colons.
 */
export const DIGIT_SLOT_EM: number = 0.67;

/**
 * The stacked lockup's strokes, drawn one by one on the sign-in page (CleanCode-logo-final/
 * logo-stacked-inverse.svg). Kept as path data so each stroke can animate on its own.
 */
export const STACKED_LOGO: StackedLogo = {
  viewBox: '-42 -295.9 1140 647.9',
  markTransform: 'translate(286.2 -326.1) scale(0.9) rotate(-14 256 300)',
  handle: 'M256 262 V92',
  brace: 'M92 352 Q92 312 132 312 L212 312 Q252 312 256 270 Q260 312 300 312 L380 312 Q420 312 420 352',
  blade: 'M104 398 H408',
  clean:
    'M97.2 216.5 A50 50 0 1 0 97.2 283.5 M134 150 V300 M170 250 H270 A50 50 0 1 0 257.2 283.5 M296 250 A50 50 0 1 0 396 250 A50 50 0 1 0 296 250 M396 200 V300 M432 200 V300 M432 250 A50 50 0 0 1 532 250 V300',
  code: 'M647.2 216.5 A50 50 0 1 0 647.2 283.5 M684 250 A50 50 0 1 0 784 250 A50 50 0 1 0 684 250 M810 250 A50 50 0 1 0 910 250 A50 50 0 1 0 810 250 M910 150 V300 M944 250 H1044 A50 50 0 1 0 1031.2 283.5',
};
