import type { ReactElement } from 'react';
import { maxLength, required, SimpleForm, TextInput, type Validator } from 'react-admin';
import type { FormToolbarProps } from '../../../types/components';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';

const validateName: Validator[] = [required(), maxLength(100)];

/** A category: its name and, optionally, what goes in it. */
const CategoryForm = ({ withDelete = false }: FormToolbarProps): ReactElement => (
  <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
    <TextInput source="name" validate={validateName} fullWidth />
    <TextInput source="description" multiline minRows={2} validate={maxLength(500)} parse={emptyToNull} fullWidth />
  </SimpleForm>
);

export default CategoryForm;
