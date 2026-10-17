import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import {
  BooleanInput,
  email,
  maxLength,
  minLength,
  PasswordInput,
  required,
  SimpleForm,
  TextInput,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
  type Validator,
} from 'react-admin';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../constants/users';
import useIsSelf from '../../../hooks/useIsSelf';
import type { User } from '../../../types/api';
import type { UserFormProps } from '../../../types/users';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';

const passwordRules: Validator[] = [minLength(PASSWORD_MIN_LENGTH), maxLength(PASSWORD_MAX_LENGTH)];
const validateNewPassword: Validator[] = [required(), ...passwordRules];
const validateEmail: Validator[] = [required(), email(), maxLength(254)];

/**
 * A user account (SPEC-003): who the person is, then how they get in. Every user can manage users,
 * but nobody can deactivate or delete their own account; the API refuses both, and the form doesn't
 * offer them.
 */
const UserForm = ({ isEdit = false }: UserFormProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const record: User | undefined = useRecordContext<User>();
  const isSelf: boolean = useIsSelf(record);

  return (
    <SimpleForm toolbar={<FormToolbar withDelete={isEdit && !isSelf} />}>
      <Section title={translate('app.users.sections.account')} hint={translate('app.users.hints.account')}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput source="name" validate={maxLength(100)} parse={emptyToNull} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextInput source="email" type="email" validate={validateEmail} autoComplete="off" fullWidth />
        </Grid>
      </Section>
      <SectionDivider />
      <Section title={translate('app.users.sections.access')} hint={translate('app.users.hints.access')}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PasswordInput
            source="password"
            label={isEdit ? 'app.users.newPassword' : undefined}
            // An element, not a string: react-admin would run an already translated string through
            // translate() again.
            helperText={
              isEdit ? 'app.users.help.keepPassword' : <>{translate('app.users.help.newPassword', { min: PASSWORD_MIN_LENGTH })}</>
            }
            validate={isEdit ? passwordRules : validateNewPassword}
            // Stops the browser from filling in the signed-in user's own saved password.
            autoComplete="new-password"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <BooleanInput
            source="active"
            defaultValue={true}
            disabled={isSelf}
            helperText={isSelf ? 'app.users.help.selfActive' : 'app.users.help.active'}
          />
        </Grid>
      </Section>
    </SimpleForm>
  );
};

export default UserForm;
