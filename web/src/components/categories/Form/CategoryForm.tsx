import type { ReactElement } from 'react';
import { maxLength, required, SimpleForm, TextInput, useTranslate, type TranslateFunction, type Validator } from 'react-admin';
import type { FormToolbarProps } from '../../../types/components';
import { emptyToNull } from '../../../utils/validators';
import FieldsBesideNote from '../../FieldsBesideNote';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';

const validateName: Validator[] = [required(), maxLength(100)];

/** A category: its name and, optionally, what goes in it. */
const CategoryForm = ({ withDelete = false }: FormToolbarProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete={withDelete} />}>
      <Section title={translate('app.categories.sections.category')} hint={translate('app.categories.hints.category')}>
        <FieldsBesideNote
          fields={<TextInput source="name" validate={validateName} fullWidth />}
          note={
            <TextInput source="description" multiline minRows={2} validate={maxLength(500)} parse={emptyToNull} fullWidth />
          }
        />
      </Section>
    </SimpleForm>
  );
};

export default CategoryForm;
