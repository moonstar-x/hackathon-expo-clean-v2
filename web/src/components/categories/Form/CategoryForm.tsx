import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import { maxLength, required, SimpleForm, TextInput, useTranslate, type TranslateFunction, type Validator } from 'react-admin';
import type { FormToolbarProps } from '../../../types/components';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';

const validateName: Validator[] = [required(), maxLength(100)];

/** A category: its name and, optionally, what goes in it. */
const CategoryForm = ({ withDelete = false }: FormToolbarProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
      <Section title={translate('app.categories.sections.category')} hint={translate('app.categories.hints.category')}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput source="name" validate={validateName} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextInput source="description" multiline minRows={2} validate={maxLength(500)} parse={emptyToNull} fullWidth />
        </Grid>
      </Section>
    </SimpleForm>
  );
};

export default CategoryForm;
