import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { primaryNameSx } from '../../styles/list';
import { mergeSx } from '../../styles/sx';
import type { PrimaryRowProps } from '../../types/list';

/** A SimpleList primary line: the wrapping title on the left, a badge or action top-right. */
const PrimaryRow = ({ children, end }: PrimaryRowProps): ReactElement => (
  <Stack component="span" direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
    <Box component="span" sx={mergeSx(primaryNameSx, { flex: 1, minWidth: 0 })}>
      {children}
    </Box>
    {end ? (
      <Box component="span" sx={{ flexShrink: 0 }}>
        {end}
      </Box>
    ) : null}
  </Stack>
);

export default PrimaryRow;
