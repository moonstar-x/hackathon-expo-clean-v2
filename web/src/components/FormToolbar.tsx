import type { ReactElement } from 'react';
import { DeleteButton, SaveButton, Toolbar } from 'react-admin';
import { formToolbarSx } from '../styles/pages';
import type { FormToolbarProps } from '../types/components';

/** Save on the left and, on edit pages, Delete on the right; it asks first and waits for the API. */
const FormToolbar = ({ withDelete = false }: FormToolbarProps): ReactElement => (
  <Toolbar sx={formToolbarSx}>
    <SaveButton />
    {withDelete ? <DeleteButton mutationMode="pessimistic" /> : null}
  </Toolbar>
);

export default FormToolbar;
