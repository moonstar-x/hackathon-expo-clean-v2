import { z } from 'zod';
import { bool, nullableText, requiredText } from '../../lib/validation.ts';

/** `password` is write-only: accepted in bodies, never returned. */
export const USER_FIELDS = ['email', 'name', 'password', 'active'] as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const email = requiredText(254)
  .refine((v) => z.email().safeParse(v).success, 'Must be a valid email')
  .transform((v) => v.toLowerCase());

// Not trimmed: spaces are legitimate password characters.
const password = z
  .string({ error: (iss) => (iss.input == null ? 'Required' : 'Must be a string') })
  .min(1, 'Required')
  .min(PASSWORD_MIN_LENGTH, `Must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Must be at most ${PASSWORD_MAX_LENGTH} characters`);

export const userCreateSchema = z.object({
  email,
  name: nullableText(100),
  password,
  active: bool().default(true),
});

/** Merged PUT record. A missing, null or empty `password` keeps the current one. */
export const userUpdateSchema = z.object({
  email,
  name: nullableText(100),
  password: z.preprocess((v) => (v === '' || v === null ? undefined : v), password.optional()),
  active: bool(),
});

export type UserCreateInput = z.output<typeof userCreateSchema>;
export type UserUpdateInput = z.output<typeof userUpdateSchema>;
