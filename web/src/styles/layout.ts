// Styles of the app shell (Layout.tsx).
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * From `md` up, react-admin's shell grows to fit a wide table: the window scrolls sideways, with its
 * scrollbar always in view, instead of the table's last columns being cut at its card's edge. Below
 * `md` the lists are cards, and the shell keeps to the screen's width so nothing pushes it wider.
 */
export const layoutSx: SxProps<Theme> = (theme: Theme) => ({
  [theme.breakpoints.down('md')]: { minWidth: 0, '& .RaLayout-content': { minWidth: 0 } },
});
