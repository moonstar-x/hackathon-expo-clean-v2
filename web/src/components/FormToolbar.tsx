import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DeleteButton, SaveButton, Toolbar } from 'react-admin';
import { formToolbarNoteSx, formToolbarStartSx, formToolbarSx } from '../styles/pages';
import type { FormToolbarProps } from '../types/components';

/**
 * Save on the left, then any extra actions, with a line beside them when saving needs a word, and,
 * on edit pages, Delete on the right; it asks first and waits for the API.
 */
const FormToolbar = ({ withDelete = false, note, actions }: FormToolbarProps): ReactElement => (
  <Toolbar sx={formToolbarSx}>
    <Box sx={formToolbarStartSx}>
      <SaveButton />
      {actions}
      {note ? <Typography sx={formToolbarNoteSx}>{note}</Typography> : null}
    </Box>
    {withDelete ? <DeleteButton mutationMode="pessimistic" /> : null}
  </Toolbar>
);

export default FormToolbar;
