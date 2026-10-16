import type { ReactElement } from 'react';
import { maxLength, required, SimpleForm, TextInput, type Validator } from 'react-admin';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';

const validateName: Validator[] = [required(), maxLength(100)];

/** What can change after upload (SPEC-004 §4.2): the name, and notes for whoever works in the space. */
const MeasurementForm = (): ReactElement => (
  <SimpleForm toolbar={<FormToolbar withDelete />}>
    <TextInput source="name" validate={validateName} fullWidth />
    <TextInput
      source="notes"
      multiline
      minRows={3}
      validate={maxLength(1000)}
      parse={emptyToNull}
      helperText="app.measurements.help.notes"
      fullWidth
    />
  </SimpleForm>
);

export default MeasurementForm;
