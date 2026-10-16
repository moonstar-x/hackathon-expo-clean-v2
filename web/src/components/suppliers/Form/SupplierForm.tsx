import type { ReactElement } from 'react';
import { email, maxLength, required, SimpleForm, TextInput, type Validator } from 'react-admin';
import type { FormToolbarProps } from '../../../types/components';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';

const validateName: Validator[] = [required(), maxLength(150)];
const validateEmail: Validator[] = [email(), maxLength(254)];

/** A supplier: its name and, optionally, who to talk to and how to reach them. */
const SupplierForm = ({ withDelete = false }: FormToolbarProps): ReactElement => (
  <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
    <TextInput source="name" validate={validateName} fullWidth />
    <TextInput source="contactName" validate={maxLength(150)} parse={emptyToNull} fullWidth />
    <TextInput source="email" type="email" validate={validateEmail} parse={emptyToNull} fullWidth />
    <TextInput source="phone" type="tel" validate={maxLength(50)} parse={emptyToNull} />
    <TextInput source="notes" multiline minRows={3} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
  </SimpleForm>
);

export default SupplierForm;
