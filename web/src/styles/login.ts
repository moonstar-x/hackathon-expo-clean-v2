// Styles of the sign-in page (components/login). The page is always on brand navy: the squeegee
// draws itself, then its blade wipes the logo's pane clean and the form comes in beside it.
import { alpha, keyframes, type SxProps, type Theme } from '@mui/material/styles';
import { BRAND } from '../constants/brand';

// Each stroke has pathLength="1", so one dash of length 1 covers it whatever its real length.
const draw: string = keyframes`
  from { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; }
  1% { opacity: 1; }
  to { stroke-dasharray: 1; stroke-dashoffset: 0; opacity: 1; }
`;

const wipe: string = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`;

const bladeEdge: string = keyframes`
  from { transform: translateX(-100%); opacity: 1; }
  85% { opacity: 1; }
  to { transform: translateX(0); opacity: 0; }
`;

const fadeIn: string = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const EASE: string = 'cubic-bezier(0.65, 0, 0.35, 1)';
const BLADE_AT: number = 1000;
const WIPE_MS: number = 750;

/** One stroke of the logo, drawn after `delay` ms over `duration` ms. */
const stroke = (delay: number, duration: number): string => `${draw} ${duration}ms ${EASE} ${delay}ms both`;

export const loginRootSx: SxProps<Theme> = {
  minHeight: '100dvh',
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(0, 1fr)' },
  gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
  bgcolor: BRAND.navyDeep,
  color: BRAND.white,
  '@media (prefers-reduced-motion: reduce)': {
    '& *, & *::before, & *::after': { animation: 'none !important' },
  },
};

/** The logo's pane: navy glass the blade wipes clean, left to right. */
export const logoPaneSx: SxProps<Theme> = {
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: { xs: 2, md: 3 },
  px: 2,
  pt: { xs: 7, md: 8 },
  pb: { xs: 5, md: 8 },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    bgcolor: BRAND.navy,
    animation: `${wipe} ${WIPE_MS}ms ${EASE} ${BLADE_AT}ms both`,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRight: `2px solid ${BRAND.sky}`,
    opacity: 0,
    pointerEvents: 'none',
    animation: `${bladeEdge} ${WIPE_MS}ms ${EASE} ${BLADE_AT}ms both`,
  },
  '& > *': { position: 'relative' },
};

export const logoSx: SxProps<Theme> = {
  display: 'block',
  width: { xs: 'min(232px, 64vw)', md: 'min(440px, 78%)' },
  height: 'auto',
  '& .handle': { animation: stroke(150, 420) },
  '& .brace': { animation: stroke(480, 560) },
  '& .blade': { animation: stroke(BLADE_AT, 380) },
  // The wordmark is wiped into view behind the blade rather than drawn: its letters are many
  // short strokes, and drawing them all at once reads as broken glyphs.
  '& .wordmark': { animation: `${wipe} 650ms ${EASE} ${BLADE_AT + 200}ms both` },
};

export const productSx: SxProps<Theme> = {
  color: BRAND.slate,
  fontSize: { xs: 14, md: 16 },
  fontWeight: 400,
  textAlign: 'center',
  animation: `${fadeIn} 600ms ease 1700ms both`,
};

export const formSideSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: { xs: 'flex-start', md: 'center' },
  justifyContent: 'center',
  px: { xs: 2, sm: 4, md: 6 },
  pt: { xs: 4, md: 8 },
  pb: { xs: 6, md: 8 },
  animation: `${fadeIn} 600ms ease 900ms both`,
};

export const formColumnSx: SxProps<Theme> = { width: '100%', maxWidth: 400 };

export const titleSx: SxProps<Theme> = { fontSize: { xs: 26, md: 30 }, fontWeight: 600, mb: 1 };

export const hintSx: SxProps<Theme> = { color: BRAND.slate, mb: 3, maxWidth: '36ch' };

export const submitSx: SxProps<Theme> = {
  mt: 2,
  py: 1.25,
  fontSize: 16,
  bgcolor: BRAND.sky,
  color: BRAND.navy,
  '&:hover': { bgcolor: alpha(BRAND.sky, 0.88) },
};
