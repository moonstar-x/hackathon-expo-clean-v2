// Styles of the quote's Documento page.
import type { SxProps, Theme } from '@mui/material/styles';

/** The preview card never widens the page: a wide workbook scrolls inside it (as the quote's tabs do). */
export const documentPreviewSx: SxProps<Theme> = { contain: 'inline-size' };

/** The downloads, one line each, without bullets. */
export const documentHistorySx: SxProps<Theme> = { listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.75 };
