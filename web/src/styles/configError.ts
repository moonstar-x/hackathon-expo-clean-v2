// Styles of the page shown when the build-time configuration is invalid (ConfigErrorPage.tsx).
import type { SxProps, Theme } from '@mui/material/styles';

export const configErrorPageSx: SxProps<Theme> = { maxWidth: 640, mx: 'auto', my: '10vh', px: 2 };

export const configErrorListSx: SxProps<Theme> = { my: 2, pl: 3, '& li': { mb: 0.5 } };

export const configErrorCodeSx: SxProps<Theme> = {
  px: 0.75,
  py: 0.25,
  borderRadius: 1,
  bgcolor: 'action.hover',
  fontSize: '0.875em',
};
