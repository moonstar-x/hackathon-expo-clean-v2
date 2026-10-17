import type { ReactElement } from 'react';
import {
  email,
  maxLength,
  required,
  SimpleForm,
  TextInput,
  useTranslate,
  type TranslateFunction,
  type Validator,
} from 'react-admin';
import type { FormToolbarProps } from '../../../types/components';
import { emptyToNull } from '../../../utils/validators';
import FieldsBesideNote from '../../FieldsBesideNote';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';

const validateName: Validator[] = [required(), maxLength(150)];
const validateEmail: Validator[] = [email(), maxLength(254)];

/** A supplier: who they are, who to talk to and how to reach them, beside the notes on them. */
const SupplierForm = ({ withDelete = false }: FormToolbarProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
      <Section title={translate('app.suppliers.sections.supplier')} hint={translate('app.suppliers.hints.supplier')}>
        <FieldsBesideNote
          fields={
            <>
              <TextInput source="name" validate={validateName} fullWidth />
              <TextInput source="contactName" validate={maxLength(150)} parse={emptyToNull} fullWidth />
              <TextInput source="email" type="email" validate={validateEmail} parse={emptyToNull} fullWidth />
              <TextInput source="phone" type="tel" validate={maxLength(50)} parse={emptyToNull} fullWidth />
            </>
          }
          note={<TextInput source="notes" multiline minRows={3} validate={maxLength(1000)} parse={emptyToNull} fullWidth />}
        />
      </Section>
    </SimpleForm>
  );
};

export default SupplierForm;
