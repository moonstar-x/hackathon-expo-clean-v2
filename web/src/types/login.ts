import type { FieldValues } from 'react-hook-form';

/** The sign-in form's values; `username` holds the email, as react-admin's own form names it. */
export interface LoginValues extends FieldValues {
  username: string;
  password: string;
}
