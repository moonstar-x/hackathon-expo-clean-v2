import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { PageHeaderProps } from '../types/components';

/**
 * The page heading of the admin: an uppercase eyebrow over a real h1. react-admin's AppBar
 * title is a <span>, so every screen renders this for its heading.
 */
const PageHeader = ({ eyebrow, title, badge, actions }: PageHeaderProps): ReactElement => (
  <Box component="header" sx={{ mt: { xs: 1.5, sm: 2.5 }, mb: 2 }}>
    <Typography
      component="p"
      sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {eyebrow}
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1.5, rowGap: 0.5 }}>
      <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 27 }, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
        {title}
      </Typography>
      {badge}
    </Box>
    {actions ? (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
        {actions}
      </Stack>
    ) : null}
  </Box>
);

export default PageHeader;
