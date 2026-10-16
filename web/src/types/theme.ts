import type { Theme } from '@mui/material/styles';

export type Mode = 'light' | 'dark';

/** The argument MUI passes to a function style override. */
export interface StyleArgs {
  theme: Theme;
}

/** CleanCode brand colors (see design.md). */
export interface BrandColors {
  readonly navy: string;
  readonly navyDeep: string;
  readonly indigo: string;
  readonly indigoDeep: string;
  readonly sky: string;
  readonly white: string;
  readonly mist: string;
  readonly slate: string;
}

/** Path data of the stacked lockup, one entry per stroke the sign-in page animates. */
export interface StackedLogo {
  viewBox: string;
  markTransform: string;
  handle: string;
  brace: string;
  blade: string;
  clean: string;
  code: string;
}
