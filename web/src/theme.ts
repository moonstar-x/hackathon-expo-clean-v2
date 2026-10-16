// CleanCode theme for react-admin: flat surfaces, soft shadows, filled inputs and frosted table
// headers, in the CleanCode palette. See design.md.
import { esES } from '@mui/material/locale';
import {
  alpha,
  createTheme,
  type Components,
  type CSSObject,
  type Shadows,
  type Theme,
  type ThemeOptions,
  type TypographyVariantsOptions,
} from '@mui/material/styles';
import { defaultDarkTheme, defaultTheme, type RaThemeOptions } from 'react-admin';
import { APP_LOCALE } from './constants/app';
import { BRAND } from './constants/brand';
import type { Mode, StyleArgs } from './types/theme';

const typography: TypographyVariantsOptions = {
  fontFamily: ['Poppins', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Arial', 'sans-serif'].join(','),
  h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
  h2: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 },
  h4: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  h5: { fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35 },
  h6: { fontWeight: 600, letterSpacing: '0em', lineHeight: 1.4 },
  subtitle1: { fontWeight: 500, letterSpacing: '0em' },
  subtitle2: { fontWeight: 600, letterSpacing: '0em' },
  body1: { letterSpacing: '0em', lineHeight: 1.55 },
  body2: { letterSpacing: '0em', lineHeight: 1.55 },
  button: { fontWeight: 600, textTransform: 'none' },
  overline: { fontWeight: 600, letterSpacing: '0.12em' },
  caption: { letterSpacing: '0.01em' },
};

// Soft shadow scale tinted with the brand navy instead of MUI's heavier black.
const buildShadows = (mode: Mode): Shadows => {
  const c: string = mode === 'dark' ? '0,0,0' : '15,23,42';
  const k = (y: number, blur: number, a: number): string => `0 ${y}px ${blur}px rgba(${c},${a})`;
  const dark: boolean = mode === 'dark';
  return [
    'none',
    `${k(1, 2, dark ? 0.32 : 0.04)}, ${k(1, 1, dark ? 0.24 : 0.02)}`,
    `${k(2, 4, dark ? 0.34 : 0.05)}, ${k(1, 2, dark ? 0.24 : 0.03)}`,
    `${k(4, 8, dark ? 0.36 : 0.06)}, ${k(2, 4, dark ? 0.24 : 0.03)}`,
    `${k(6, 12, dark ? 0.38 : 0.07)}, ${k(2, 4, dark ? 0.24 : 0.04)}`,
    `${k(8, 16, dark ? 0.4 : 0.08)}, ${k(3, 6, dark ? 0.24 : 0.04)}`,
    `${k(10, 20, dark ? 0.42 : 0.09)}, ${k(4, 8, dark ? 0.26 : 0.05)}`,
    `${k(12, 24, dark ? 0.44 : 0.1)}, ${k(4, 10, dark ? 0.28 : 0.05)}`,
    `${k(14, 28, dark ? 0.46 : 0.11)}, ${k(5, 12, dark ? 0.3 : 0.06)}`,
    `${k(16, 32, dark ? 0.48 : 0.12)}, ${k(6, 14, dark ? 0.3 : 0.06)}`,
    `${k(18, 36, dark ? 0.5 : 0.13)}, ${k(7, 16, dark ? 0.32 : 0.07)}`,
    `${k(20, 40, dark ? 0.52 : 0.14)}, ${k(8, 18, dark ? 0.32 : 0.07)}`,
    `${k(22, 44, dark ? 0.54 : 0.15)}, ${k(9, 20, dark ? 0.34 : 0.08)}`,
    `${k(24, 48, dark ? 0.56 : 0.16)}, ${k(10, 22, dark ? 0.34 : 0.08)}`,
    `${k(26, 52, dark ? 0.58 : 0.17)}, ${k(11, 24, dark ? 0.36 : 0.09)}`,
    `${k(28, 56, dark ? 0.6 : 0.18)}, ${k(12, 26, dark ? 0.36 : 0.09)}`,
    `${k(30, 60, dark ? 0.62 : 0.19)}, ${k(13, 28, dark ? 0.38 : 0.1)}`,
    `${k(32, 64, dark ? 0.64 : 0.2)}, ${k(14, 30, dark ? 0.38 : 0.1)}`,
    `${k(34, 68, dark ? 0.66 : 0.21)}, ${k(15, 32, dark ? 0.4 : 0.11)}`,
    `${k(36, 72, dark ? 0.68 : 0.22)}, ${k(16, 34, dark ? 0.4 : 0.11)}`,
    `${k(38, 76, dark ? 0.7 : 0.23)}, ${k(17, 36, dark ? 0.42 : 0.12)}`,
    `${k(40, 80, dark ? 0.72 : 0.24)}, ${k(18, 38, dark ? 0.42 : 0.12)}`,
    `${k(42, 84, dark ? 0.74 : 0.25)}, ${k(19, 40, dark ? 0.44 : 0.13)}`,
    `${k(44, 88, dark ? 0.76 : 0.26)}, ${k(20, 42, dark ? 0.44 : 0.13)}`,
    `${k(48, 96, dark ? 0.78 : 0.27)}, ${k(22, 46, dark ? 0.46 : 0.14)}`,
  ];
};

const shape: { borderRadius: number } = { borderRadius: 10 };

const buildComponents = (mode: Mode): Components<Omit<Theme, 'components'>> => {
  const dark: boolean = mode === 'dark';
  // Colors for overrides written as plain objects (no theme in scope).
  const accent: string = dark ? BRAND.sky : BRAND.indigo;
  const mutedText: string = dark ? 'rgba(203, 213, 225, 0.62)' : 'rgba(15, 23, 42, 0.6)';
  const ink: string = dark ? '255,255,255' : '15,23,42';
  const popoverShadow: string = dark
    ? '0 16px 40px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)'
    : '0 12px 32px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)';
  const tableHeaderGlass: string = dark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(248, 250, 252, 0.85)';
  const tableWrapperScroll: CSSObject = {
    '& .RaDatagrid-tableWrapper, & .RaDataTable-tableWrapper': { overflowX: 'auto' },
  };

  return {
    // Read the viewport on the first render, so a mobile/desktop switch never renders (and
    // fetches) the wrong view first. This app renders only in the browser.
    MuiUseMediaQuery: { defaultProps: { noSsr: true } },

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
          scrollbarColor: `rgba(${ink},0.18) transparent`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': { width: 10, height: 10 },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: `rgba(${ink},${dark ? 0.16 : 0.18})`,
            minHeight: 24,
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: `rgba(${ink},${dark ? 0.28 : 0.32})`,
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true, size: 'medium' },
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition:
            'background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease, color 160ms ease',
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(accent, 0.32)}` },
        },
        // react-admin's FilterButton, ColumnsButton and CreateButton are size="small"; render them
        // at medium size so every toolbar button lines up.
        sizeSmall: { padding: '6px 16px', fontSize: '0.875rem', lineHeight: 1.75 },
        textSizeSmall: { padding: '6px 8px' },
        outlinedSizeSmall: { padding: '5px 15px' },
        containedSizeSmall: { padding: '6px 16px' },
        contained: {
          boxShadow: dark
            ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)'
            : '0 1px 0 rgba(255,255,255,0.4) inset, 0 1px 2px rgba(15,23,42,0.08)',
          '&:hover': {
            boxShadow: dark
              ? '0 1px 0 rgba(255,255,255,0.06) inset, 0 4px 14px rgba(0,0,0,0.5)'
              : '0 1px 0 rgba(255,255,255,0.5) inset, 0 4px 14px rgba(15,23,42,0.12)',
          },
        },
        outlined: { borderWidth: 1, '&:hover': { borderWidth: 1 } },
        text: { '&:hover': { backgroundColor: `rgba(${ink},${dark ? 0.06 : 0.05})` } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 140ms ease, color 140ms ease',
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(accent, 0.32)}` },
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: { root: { borderRadius: 10, textTransform: 'none', fontWeight: 600 } },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 12 },
        outlined: ({ theme }: StyleArgs) => ({ borderColor: theme.palette.divider }),
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 14,
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
          boxShadow: dark
            ? '0 1px 2px rgba(0,0,0,0.4)'
            : '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }),
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          paddingTop: 18,
          paddingBottom: 14,
          marginBottom: 12,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
        title: { fontWeight: 600, letterSpacing: '-0.005em' },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 0,
          backdropFilter: 'saturate(180%) blur(8px)',
          WebkitBackdropFilter: 'saturate(180%) blur(8px)',
          backgroundColor: dark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          backgroundImage: 'none',
        }),
      },
    },

    MuiToolbar: { styleOverrides: { root: { minHeight: 56 } } },

    MuiDrawer: {
      styleOverrides: {
        // A drawer is an edge of the screen, not a card: no rounded corners from the Paper default.
        paper: ({ theme }: StyleArgs) => ({
          backgroundImage: 'none',
          borderRadius: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
        }),
      },
    },

    // Inputs ----------------------------------------------------------------
    MuiTextField: { defaultProps: { variant: 'filled', size: 'small', fullWidth: undefined } },

    MuiFilledInput: {
      defaultProps: { disableUnderline: true },
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 10,
          backgroundColor: `rgba(${ink},0.04)`,
          border: `1px solid rgba(${ink},0.06)`,
          transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
          '&:hover': { backgroundColor: `rgba(${ink},0.06)` },
          '&.Mui-focused': {
            backgroundColor: `rgba(${ink},${dark ? 0.08 : 0.05})`,
            borderColor: alpha(theme.palette.primary.main, 0.5),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
          '&.Mui-error.Mui-focused': {
            borderColor: alpha(theme.palette.error.main, 0.5),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.18)}`,
          },
          '&:before, &:after': { display: 'none' },
        }),
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 10,
          transition: 'box-shadow 140ms ease',
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}` },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `rgba(${ink},0.24)` },
        }),
      },
    },

    MuiInputBase: {
      styleOverrides: {
        input: {
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${dark ? BRAND.navy : BRAND.white} inset`,
            WebkitTextFillColor: dark ? 'rgba(255,255,255,0.87)' : 'rgba(15,23,42,0.87)',
            caretColor: 'inherit',
            borderRadius: 'inherit',
          },
        },
      },
    },

    MuiInputLabel: { styleOverrides: { root: { letterSpacing: '0.005em' } } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 4, marginRight: 4 } } },

    MuiAutocomplete: {
      defaultProps: { fullWidth: undefined },
      styleOverrides: {
        tag: { height: '40px', borderRadius: 8 },
        paper: ({ theme }: StyleArgs) => ({
          borderRadius: 12,
          marginTop: 6,
          boxShadow: popoverShadow,
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        }),
        listbox: { padding: 6, '& .MuiAutocomplete-option': { borderRadius: 8, margin: '2px 0' } },
      },
    },

    MuiFormControl: { defaultProps: { fullWidth: undefined } },

    // Chips, avatars, badges --------------------------------------------------
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          letterSpacing: '0.005em',
          transition: 'background-color 140ms ease, border-color 140ms ease',
        },
        outlined: ({ theme }: StyleArgs) => ({ borderColor: theme.palette.divider }),
        label: ({ theme }: StyleArgs) => ({ color: theme.palette.text.primary }),
      },
    },

    MuiAvatar: { styleOverrides: { root: { fontWeight: 600, letterSpacing: 0 } } },
    MuiBadge: { styleOverrides: { badge: { borderRadius: 999, fontWeight: 600 } } },

    // Tables ----------------------------------------------------------------
    MuiTableContainer: { styleOverrides: { root: { borderRadius: 12 } } },

    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderColor: theme.palette.divider,
          '.RaCopyFieldWrapper': { justifyContent: 'space-between' },
        }),
        head: ({ theme }: StyleArgs) => ({
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: theme.palette.text.secondary,
          backgroundColor: `rgba(${ink},0.02)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiButtonBase-root': { fontWeight: 600 },
        }),
        body: { '& .MuiStack-root': { width: '100%', marginBottom: '0px' } },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          transition: 'background-color 140ms ease',
          '&:last-of-type td': { borderBottom: 0 },
          '&.MuiTableRow-hover:hover': {
            backgroundColor: dark ? 'rgba(255,255,255,0.03)' : alpha(theme.palette.primary.main, 0.04),
          },
        }),
      },
    },

    // Menus, popovers, tooltips ---------------------------------------------
    MuiMenu: {
      styleOverrides: {
        root: { '&#menu-appbar .MuiMenu-paper': { marginTop: 8 } },
        paper: ({ theme }: StyleArgs) => ({
          borderRadius: 12,
          marginTop: 6,
          padding: 6,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: popoverShadow,
          backgroundImage: 'none',
        }),
        list: { padding: 0 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 8,
          margin: '1px 0',
          transition: 'background-color 120ms ease',
          '&:hover': { backgroundColor: `rgba(${ink},${dark ? 0.06 : 0.05})` },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.16) },
          },
        }),
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }: StyleArgs) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: popoverShadow,
          backgroundImage: 'none',
        }),
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: dark ? 'rgba(10, 16, 34, 0.96)' : 'rgba(15, 23, 42, 0.96)',
          color: '#fff',
          borderRadius: 8,
          padding: '6px 10px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        },
        arrow: { color: dark ? 'rgba(10, 16, 34, 0.96)' : 'rgba(15, 23, 42, 0.96)' },
      },
    },

    // Dialogs ---------------------------------------------------------------
    MuiDialog: {
      // Never scroll-lock <body>: the app scrolls on the window, and the lock jumps a scrolled
      // page to the top on iOS Safari. Dialogs scroll their own content instead.
      defaultProps: { disableScrollLock: true },
      styleOverrides: {
        paper: ({ theme }: StyleArgs) => ({
          borderRadius: 16,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: dark
            ? '0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)'
            : '0 32px 80px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.08)',
          backgroundImage: 'none',
          [theme.breakpoints.down('sm')]: { '&.MuiDialog-paperFullScreen': { borderRadius: 0, border: 0 } },
        }),
      },
    },

    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 600, letterSpacing: '-0.005em', paddingBottom: 8 } } },

    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          padding: '12px 20px 16px',
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: 8,
        }),
      },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.32)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          '&.MuiBackdrop-invisible': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        },
      },
    },

    // Tabs ------------------------------------------------------------------
    MuiTabs: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({ borderBottom: `1px solid ${theme.palette.divider}`, minHeight: 40 }),
        indicator: ({ theme }: StyleArgs) => ({
          height: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.primary.main,
        }),
      },
    },

    MuiTab: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.005em',
          minHeight: 40,
          borderRadius: '8px 8px 0 0',
          transition: 'color 140ms ease, background-color 140ms ease',
          '&:hover': { color: theme.palette.text.primary, backgroundColor: `rgba(${ink},0.03)` },
          '&.Mui-selected': { fontWeight: 600 },
        }),
      },
    },

    // Toggles ---------------------------------------------------------------
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 40,
          height: 22,
          padding: 0,
          // FormControlLabel relies on the default 12px Switch padding for the gap to its label.
          margin: '0 12px',
          display: 'flex',
          '& .MuiSwitch-switchBase': {
            padding: 3,
            '&.Mui-checked': {
              transform: 'translateX(18px)',
              color: '#fff',
              '& + .MuiSwitch-track': { opacity: 1, backgroundColor: accent },
            },
          },
          '& .MuiSwitch-thumb': {
            width: 16,
            height: 16,
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '& .MuiSwitch-track': {
            borderRadius: 11,
            backgroundColor: `rgba(${ink},${dark ? 0.16 : 0.18})`,
            opacity: 1,
            transition: 'background-color 200ms ease',
          },
        },
      },
    },

    // The rows behind <ColumnsButton>: with the Switch above set to display:flex the field name
    // would drop below its toggle, so lay each row out as "name ...... toggle".
    RaFieldToggle: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          paddingTop: theme.spacing(0.75),
          paddingBottom: theme.spacing(0.75),
          '& label': {
            display: 'flex',
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            gap: theme.spacing(1),
          },
        }),
      },
    },

    MuiCheckbox: { styleOverrides: { root: { borderRadius: 6, padding: 6 } } },
    MuiRadio: { styleOverrides: { root: { padding: 6 } } },

    // Links: underlined on hover only, so tables full of references stay calm (added for web/).
    MuiLink: { defaultProps: { underline: 'hover' } },

    // Misc ------------------------------------------------------------------
    MuiDivider: { styleOverrides: { root: ({ theme }: StyleArgs) => ({ borderColor: theme.palette.divider }) } },

    MuiAlert: {
      defaultProps: { variant: 'standard' },
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 10,
          border: `1px solid ${theme.palette.divider}`,
          alignItems: 'center',
        }),
      },
    },

    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 6 }, bar: { borderRadius: 999 } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' } } },
    MuiBreadcrumbs: { styleOverrides: { separator: { marginLeft: 6, marginRight: 6, opacity: 0.6 } } },
    MuiList: { styleOverrides: { root: { padding: 4 } } },

    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          borderRadius: 8,
          margin: '1px 4px',
          transition: 'background-color 120ms ease, color 120ms ease',
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.16) },
          },
        }),
      },
    },

    // react-admin -----------------------------------------------------------
    // The menu is a MUI MenuList, focusable (tabIndex -1) so clicks on its section labels land on
    // it. Like MUI's own Menu, the list draws no focus ring; its items show their own.
    RaMenu: { styleOverrides: { root: { paddingTop: 12, outline: 0 } } },

    RaMenuItemLink: {
      styleOverrides: {
        root: {
          // Keep the icon centered when the sidebar is collapsed.
          paddingLeft: 8,
          '& .RaMenuItemLink-icon': { color: mutedText, fill: mutedText },
          '&.RaMenuItemLink-active': {
            color: accent,
            '& .RaMenuItemLink-icon': { color: accent, fill: accent },
          },
        },
      },
    },

    // react-admin's skip link sets white text on the page background, so it was all but invisible.
    // It shows on the first Tab: a brand button, centred in the AppBar it covers while focused.
    RaSkipNavigationButton: {
      // Its ring already shows focus; MUI's pulsing focus ripple drew a second shape inside.
      defaultProps: { disableFocusRipple: true },
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          padding: '8px 16px',
          borderRadius: 10,
          fontWeight: 600,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}, 0 8px 24px rgba(15, 23, 42, 0.18)`,
          '&:hover': { opacity: 1, backgroundColor: theme.palette.primary.dark },
          '&:focus': { top: 10 },
        }),
      },
    },

    // Keep the identity on one line in the AppBar.
    RaUserMenu: { styleOverrides: { root: { '& .RaUserMenu-userButton': { whiteSpace: 'nowrap' } } } },

    RaLogout: { styleOverrides: { root: { paddingLeft: 8, '& .RaLogout-icon': { minWidth: 40 } } } },

    RaSimpleFormIterator: {
      defaultProps: { fullWidth: undefined },
      styleOverrides: { root: { '& .RaSimpleFormIterator-form': { paddingTop: '8px' } } },
    },

    // Lists shrink with the page instead of stretching it: the table scrolls inside its card and
    // the toolbar's filters and actions wrap onto more lines on narrow screens.
    // The card clips its rows: react-admin leaves it unclipped, so row hover tints and the expand
    // toggle spilled past its rounded corners.
    RaList: {
      styleOverrides: { root: { minWidth: 0, '& .RaList-main': { minWidth: 0 }, '& .RaList-content': { overflow: 'hidden' } } },
    },
    RaListToolbar: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          paddingTop: '8px',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          rowGap: 8,
          // On phones react-admin paints the toolbar as a white band around an empty filter form;
          // the count and icons sit on the page instead, in line with the title and the cards.
          [theme.breakpoints.down('sm')]: { backgroundColor: 'transparent', paddingTop: 0, rowGap: 0 },
        }),
      },
    },

    // react-admin lays the filter bar out with align-items: flex-end, so inputs of different
    // heights (a search box next to labeled selects) end up at different levels; center them.
    RaFilterForm: { styleOverrides: { root: { '& .RaFilterForm-filterFormInput': { alignItems: 'center' } } } },

    RaAutocompleteInput: { styleOverrides: { root: { minWidth: '240px' } } },
    RaTextInput: { styleOverrides: { root: { minWidth: 240 } } },
    RaNumberInput: { styleOverrides: { root: { minWidth: 240 } } },
    RaSelectInput: { styleOverrides: { root: { minWidth: 240 } } },
    RaLabeled: { styleOverrides: { root: { marginBottom: '14px' } } },
    RaTopToolbar: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          gap: 8,
          flexWrap: 'wrap',
          [theme.breakpoints.down('sm')]: { backgroundColor: 'transparent' },
        }),
      },
    },

    RaDataTable: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          '& .RaDataTable-headerCell': {
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: theme.palette.text.secondary,
            // Frosted header so sticky labels stay legible over scrolled rows.
            backgroundColor: tableHeaderGlass,
            backdropFilter: 'saturate(180%) blur(8px)',
            WebkitBackdropFilter: 'saturate(180%) blur(8px)',
            // Match the card's 14px radius so the corner cells follow its rounded clip.
            '&:first-of-type': { borderTopLeftRadius: 14 },
            '&:last-child': { borderTopRightRadius: 14 },
          },
          '& .RaDataTable-rowCell': { borderColor: theme.palette.divider },
          // The expand toggle: a round button inset from the card edge, instead of react-admin's
          // flush one whose square hover filled the row height.
          '& .RaDataTable-expandHeader, & .RaDataTable-expandIconCell': { width: 44, paddingLeft: 8, paddingRight: 0 },
          '& .RaDataTable-expandIcon': { width: 28, height: 28, padding: 4, borderRadius: '50%' },
          // An expanded panel lays itself out from the card edge.
          '& .RaDataTable-expandRow > td': { paddingLeft: 0, paddingRight: 0 },
          ...tableWrapperScroll,
        }),
      },
    },

    // Small screens: let wide tables scroll inside their card and keep content clear of the
    // phone's home indicator.
    RaTabbedShowLayout: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          [theme.breakpoints.down('sm')]: {
            '& .RaTabbedShowLayout-content': {
              maxWidth: '100%',
              paddingBottom: `calc(${theme.spacing(8)} + env(safe-area-inset-bottom))`,
            },
            ...tableWrapperScroll,
          },
        }),
      },
    },

    RaTabbedForm: {
      styleOverrides: {
        root: ({ theme }: StyleArgs) => ({
          [theme.breakpoints.down('sm')]: {
            '& > .MuiCardContent-root': { paddingBottom: 'calc(5em + env(safe-area-inset-bottom, 0px))' },
            ...tableWrapperScroll,
          },
        }),
      },
    },
  };
};

const lightThemeOptions: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    mode: 'light',
    tonalOffset: 0.2,
    contrastThreshold: 3,
    primary: { main: BRAND.indigo, light: '#6366F1', dark: '#4338CA', contrastText: BRAND.white },
    secondary: { main: BRAND.navy, light: '#1E293B', dark: BRAND.navyDeep, contrastText: BRAND.white },
    background: { default: '#F8FAFC', paper: BRAND.white },
    text: {
      primary: BRAND.navy,
      secondary: 'rgba(15, 23, 42, 0.64)',
      disabled: 'rgba(15, 23, 42, 0.38)',
    },
    divider: 'rgba(15, 23, 42, 0.12)',
    action: {
      hoverOpacity: 0.08,
      hover: 'rgba(15, 23, 42, 0.06)',
      selected: 'rgba(79, 70, 229, 0.12)',
      disabledBackground: 'rgba(15, 23, 42, 0.12)',
      disabled: 'rgba(15, 23, 42, 0.26)',
      active: 'rgba(15, 23, 42, 0.54)',
    },
  },
  shape,
  shadows: buildShadows('light'),
  typography,
  components: buildComponents('light'),
};

const darkThemeOptions: RaThemeOptions = {
  ...defaultDarkTheme,
  palette: {
    ...defaultDarkTheme.palette,
    mode: 'dark',
    tonalOffset: 0.2,
    contrastThreshold: 3,
    primary: { main: BRAND.sky, light: '#7DD3FC', dark: '#0EA5E9', contrastText: BRAND.navy },
    secondary: { main: BRAND.slate, light: '#E2E8F0', dark: '#94A3B8', contrastText: BRAND.navy },
    background: { default: BRAND.navyDeep, paper: BRAND.navy },
    text: {
      primary: 'rgba(255, 255, 255, 0.88)',
      secondary: 'rgba(203, 213, 225, 0.72)',
      disabled: 'rgba(255, 255, 255, 0.38)',
    },
    divider: 'rgba(148, 163, 184, 0.18)',
    action: {
      hoverOpacity: 0.08,
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(56, 189, 248, 0.16)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      active: 'rgba(255, 255, 255, 0.54)',
    },
  },
  shape,
  shadows: buildShadows('dark'),
  typography,
  components: buildComponents('dark'),
};

// MUI's own strings in Spanish (pagination, autocomplete, alerts…) and react-admin's dates in the
// app's locale, on top of either palette.
const localization: ThemeOptions = { components: { RaDateField: { defaultProps: { locales: APP_LOCALE } } } };

export const lightTheme: Theme = createTheme(lightThemeOptions, esES, localization);
export const darkTheme: Theme = createTheme(darkThemeOptions, esES, localization);
