import type { ReactElement } from 'react';
import { maxLength, required, SimpleForm, TextInput, useTranslate, type TranslateFunction, type Validator } from 'react-admin';
import { emptyToNull } from '../../../utils/validators';
import FieldsBesideNote from '../../FieldsBesideNote';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';

const validateName: Validator[] = [required(), maxLength(100)];

/** What can change after upload (SPEC-004 §4.2): the name, and notes for whoever works in the space. */
const MeasurementForm = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete />}>
      <Section title={translate('app.measurements.sections.measurement')} hint={translate('app.measurements.hints.measurement')}>
        <FieldsBesideNote
          fields={<TextInput source="name" validate={validateName} fullWidth />}
          note={
            <TextInput
              source="notes"
              multiline
              minRows={3}
              validate={maxLength(1000)}
              parse={emptyToNull}
              helperText="app.measurements.help.notes"
              fullWidth
            />
          }
        />
      </Section>
    </SimpleForm>
  );
};

export default MeasurementForm;
