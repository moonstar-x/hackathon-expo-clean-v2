import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { metaIconSx, metaTextSx } from '../../styles/list';
import { mergeSx } from '../../styles/sx';
import type { MetaRowProps } from '../../types/list';

/**
 * One muted "icon + text" secondary line of a list row. Spans only: SimpleList wraps
 * secondaryText in a Typography, so block elements would break the DOM nesting.
 */
const MetaRow = ({ icon: Icon, children }: MetaRowProps): ReactElement => (
  <Stack component="span" direction="row" spacing={0.625} alignItems="center" sx={{ minWidth: 0 }}>
    {Icon ? <Icon sx={metaIconSx} /> : null}
    <Box component="span" sx={mergeSx(metaTextSx, { minWidth: 0, wordBreak: 'break-word', whiteSpace: 'normal' })}>
      {children}
    </Box>
  </Stack>
);

export default MetaRow;
