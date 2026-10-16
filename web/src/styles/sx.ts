import type { SxProps, Theme } from '@mui/material/styles';

/** Merges a component's own `sx` with the one passed in, keeping MUI's array form typed. */
export const mergeSx = (base: SxProps<Theme>, extra?: SxProps<Theme>): SxProps<Theme> => {
  const extras: ReadonlyArray<SxProps<Theme>> = extra === undefined ? [] : Array.isArray(extra) ? extra : [extra];
  const bases: ReadonlyArray<SxProps<Theme>> = Array.isArray(base) ? base : [base];
  return [...bases, ...extras] as SxProps<Theme>;
};
