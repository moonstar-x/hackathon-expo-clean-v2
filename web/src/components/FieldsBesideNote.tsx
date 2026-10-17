import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { noteColumnSx, noteFieldsSx } from '../styles/pages';
import type { FieldsBesideNoteProps } from '../types/components';

/**
 * Inside a Section: short inputs stacked in the left half and a long text in the right one, as tall
 * as they are, so a name is never wider than the inputs below it nor cut short beside a full-width
 * note. Phones get the inputs, then the note. Give each input `fullWidth`.
 */
const FieldsBesideNote = ({ fields, note }: FieldsBesideNoteProps): ReactElement => (
  <>
    <Grid size={{ xs: 12, md: 6 }}>
      <Stack sx={noteFieldsSx}>{fields}</Stack>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }} sx={noteColumnSx}>
      {note}
    </Grid>
  </>
);

export default FieldsBesideNote;
