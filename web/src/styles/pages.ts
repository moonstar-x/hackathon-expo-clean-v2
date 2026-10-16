// Styles of the create, edit and detail pages: a column of cards under the PageHeader.
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * A <Create> or <Edit> page: its card only as wide as the form reads well, never wider than the
 * page. react-admin's own classes, so the page stays a plain <Create>/<Edit>.
 */
export const formPageSx = (maxWidth: number): SxProps<Theme> => ({
  mb: 3,
  '& .RaCreate-main, & .RaEdit-main': { maxWidth },
});

/**
 * Save on the left, Delete on the right, on a hairline that closes the card. On phones react-admin
 * pins this bar to the bottom of the screen, where the line marks its edge over the scrolled form.
 */
export const formToolbarSx: SxProps<Theme> = {
  justifyContent: 'space-between',
  gap: 1,
  borderTop: '1px solid',
  borderColor: 'divider',
};

/** The cards of a detail page, stacked; wide enough for the stock history table. */
export const detailStackSx: SxProps<Theme> = { pb: 3, maxWidth: 1080 };

/** Room on the summary card's right for its ribbon, so the stats never run under it. */
export const ribbonContentSx: SxProps<Theme> = { pr: { xs: 15, sm: 20 } };

/** A muted note under a field, such as "Registra un movimiento para modificar las existencias". */
export const fieldNoteSx: SxProps<Theme> = { display: 'block', color: 'text.secondary' };

/** The current-stock line sits close under the product input it describes. */
export const currentStockSx: SxProps<Theme> = { mt: -1, mb: 2, color: 'text.secondary' };
