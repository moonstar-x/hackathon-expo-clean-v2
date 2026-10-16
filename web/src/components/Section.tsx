import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { SectionProps } from '../types/components';

// A titled block of a form or show layout. Children are <Grid> items, so give them
// responsive sizes, e.g. <Grid size={{ xs: 12, md: 6 }}>.
const Section = ({ title, children, hint, action }: SectionProps): ReactElement => (
  <Box sx={{ width: '100%', mt: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: hint ? 0.5 : 1 }}>
      <Typography variant="h6" component="h2" sx={{ m: 0 }}>
        {title}
      </Typography>
      {action}
    </Box>
    {hint ? (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {hint}
      </Typography>
    ) : null}
    <Grid container spacing={2}>
      {children}
    </Grid>
  </Box>
);

export default Section;
