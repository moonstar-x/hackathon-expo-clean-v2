import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
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
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';

const validateName: Validator[] = [required(), maxLength(150)];
const validateEmail: Validator[] = [email(), maxLength(254)];

/** A supplier: who they are, then who to talk to and how to reach them. */
const SupplierForm = ({ withDelete = false }: FormToolbarProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
      <Section title={translate('app.suppliers.sections.supplier')} hint={translate('app.suppliers.hints.supplier')}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput source="name" validate={validateName} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextInput source="notes" multiline minRows={3} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
        </Grid>
      </Section>
      <SectionDivider />
      <Section title={translate('app.suppliers.sections.contact')} hint={translate('app.suppliers.hints.contact')}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextInput source="contactName" validate={maxLength(150)} parse={emptyToNull} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextInput source="email" type="email" validate={validateEmail} parse={emptyToNull} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextInput source="phone" type="tel" validate={maxLength(50)} parse={emptyToNull} fullWidth />
        </Grid>
      </Section>
    </SimpleForm>
  );
};

export default SupplierForm;
