import type { ReactElement } from 'react';
import Divider from '@mui/material/Divider';

// The spacing used between sections of a page.
const SectionDivider = (): ReactElement => <Divider sx={{ my: 3, width: '100%' }} />;

export default SectionDivider;
