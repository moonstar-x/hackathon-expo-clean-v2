import { useState, type ReactElement } from 'react';
import { Form, PasswordInput, SaveButton, TextInput, required, useLogin, useNotify } from 'react-admin';
import type { FieldValues } from 'react-hook-form';
import LoginIcon from '@mui/icons-material/Login';
import { submitSx } from '../../styles/login';
import type { LoginValues } from '../../types/login';

const DEFAULT_VALUES: LoginValues = { username: '', password: '' };

/**
 * The sign-in form: the account's email and password, checked by the API. The inputs are
 * react-admin's own (`username` holds the email), so authProvider.login receives what it always has.
 */
const LoginForm = (): ReactElement => {
  const login: ReturnType<typeof useLogin> = useLogin();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const [pending, setPending] = useState<boolean>(false);

  const submit = async (values: FieldValues): Promise<void> => {
    const { username, password }: LoginValues = values as LoginValues;
    setPending(true);
    try {
      await login({ username, password });
    } catch (error: unknown) {
      notify(error instanceof Error && error.message ? error.message : 'ra.auth.sign_in_error', { type: 'error' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Form onSubmit={submit} defaultValues={DEFAULT_VALUES}>
      <TextInput
        source="username"
        label="ra.auth.username"
        autoComplete="username"
        autoFocus
        validate={required()}
        fullWidth
      />
      <PasswordInput
        source="password"
        label="ra.auth.password"
        autoComplete="current-password"
        validate={required()}
        fullWidth
      />
      <SaveButton
        label="app.auth.submit"
        icon={<LoginIcon />}
        disabled={pending}
        alwaysEnable={!pending}
        fullWidth
        size="large"
        sx={submitSx}
      />
    </Form>
  );
};

export default LoginForm;
