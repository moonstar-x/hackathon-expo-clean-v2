import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { BRAND, STACKED_LOGO } from '../../constants/brand';
import { logoSx } from '../../styles/login';

/** The stacked inverse CleanCode lockup, drawn stroke by stroke: handle, brace, blade, then the
 * wordmark wiped into view. */
const AnimatedLogo = (): ReactElement => (
  <Box
    component="svg"
    viewBox={STACKED_LOGO.viewBox}
    role="img"
    aria-label="CleanCode"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    sx={logoSx}
  >
    <g transform={STACKED_LOGO.markTransform}>
      <path className="handle" d={STACKED_LOGO.handle} pathLength={1} stroke={BRAND.white} strokeWidth={40} />
      <path className="brace" d={STACKED_LOGO.brace} pathLength={1} stroke={BRAND.white} strokeWidth={40} />
      <path className="blade" d={STACKED_LOGO.blade} pathLength={1} stroke={BRAND.sky} strokeWidth={34} />
    </g>
    <g className="wordmark">
      <path d={STACKED_LOGO.clean} stroke={BRAND.white} strokeWidth={24} />
      <path d={STACKED_LOGO.code} stroke={BRAND.sky} strokeWidth={24} />
    </g>
  </Box>
);

export default AnimatedLogo;
