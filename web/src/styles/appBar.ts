// Styles of the AppBar (components/appBar). Everything sits on the bar's centre line; the "now"
// group (clock, theme, refresh) stays quiet, and the person is the one brand-colored tile.
import type { SxProps, Theme } from '@mui/material/styles';
import { DIGIT_SLOT_EM } from '../constants/brand';

/** Every digit gets the same slot, wide enough for the widest one: Poppins has no tabular figures. */
export const digitSlotSx: SxProps<Theme> = { display: 'inline-block', width: `${DIGIT_SLOT_EM}em`, textAlign: 'center' };

/** The time over the day; two lines that span the logo's lettering, top to baseline. */
export const clockSx = (align: 'left' | 'right'): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align === 'right' ? 'flex-end' : 'flex-start',
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

export const clockTimeSx: SxProps<Theme> = {
  fontSize: 15,
  fontWeight: 600,
  lineHeight: '19px',
  letterSpacing: '0.01em',
  color: 'text.primary',
};

/** Seconds tick quietly, so the bar does not pull the eye every second. */
export const clockSecondsSx: SxProps<Theme> = { color: 'text.secondary', fontWeight: 500 };

export const clockDaySx: SxProps<Theme> = { fontSize: 11.5, fontWeight: 500, lineHeight: '15px', color: 'text.secondary' };

/** Theme toggle and refresh: muted until hovered, in the bar and in the phone menu alike. */
const quietIconButtons: SxProps<Theme> = {
  '& .MuiIconButton-root': { p: 0.75, color: 'text.secondary', '&:hover': { color: 'text.primary' } },
};

/** The clock with the theme toggle and refresh: muted icons, tight together. */
export const watchSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  '& > time': { mr: 1 },
  ...quietIconButtons,
};

/** Hairline between "now" and the person. */
export const appBarDividerSx: SxProps<Theme> = { alignSelf: 'center', height: 24, mx: 1.5 };

/** The user menu's trigger: tile, then name over email, then a chevron. */
export const userButtonSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  py: 0.5,
  pl: 0.5,
  pr: { xs: 0.5, md: 1 },
  borderRadius: '12px',
  textAlign: 'left',
  transition: 'background-color 140ms ease',
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
};

export const avatarTileSx = (size: number, filled: boolean): SxProps<Theme> => ({
  width: size,
  height: size,
  flexShrink: 0,
  display: 'inline-grid',
  placeItems: 'center',
  borderRadius: `${Math.round(size * 0.3)}px`,
  bgcolor: filled ? 'primary.main' : 'action.selected',
  color: 'primary.contrastText',
  fontSize: Math.round(size * 0.43),
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '0.02em',
});

export const identityTextSx: SxProps<Theme> = { display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: 180 };

export const identityNameSx: SxProps<Theme> = {
  fontSize: 13.5,
  fontWeight: 600,
  lineHeight: '18px',
  color: 'text.primary',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** The email under the name: quieter, and cut like the name when it runs long. */
export const identityEmailSx: SxProps<Theme> = {
  fontSize: 11.5,
  fontWeight: 500,
  lineHeight: '15px',
  color: 'text.secondary',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const chevronSx = (open: boolean): SxProps<Theme> => ({
  fontSize: 18,
  color: 'text.secondary',
  transition: 'transform 160ms ease',
  transform: open ? 'rotate(180deg)' : 'none',
});

/** Top of the user menu: who is signed in, in full. */
export const userMenuHeaderSx: SxProps<Theme> = { display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2, py: 1.5, maxWidth: 320 };

/** The full name in the menu wraps instead of being cut, unlike the one in the bar. */
export const menuNameSx: SxProps<Theme> = { fontSize: 14, fontWeight: 600, lineHeight: '20px', wordBreak: 'break-word' };

/** The email in the menu, whole: it breaks anywhere rather than run past the menu's edge. */
export const menuEmailSx: SxProps<Theme> = { fontSize: 12.5, lineHeight: '18px', color: 'text.secondary', wordBreak: 'break-all' };

/** The clock and its controls at the top of the phone menu. */
export const menuNowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  px: 2,
  py: 1,
  ...quietIconButtons,
};
