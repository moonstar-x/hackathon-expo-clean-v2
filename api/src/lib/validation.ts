import { z } from 'zod';
import { badRequest, notFound } from './errors.ts';
import { hasAtMostDecimals, MAX_NUMBER } from './numbers.ts';

// Shared zod building blocks so every resource reports errors the same way.

const tooLong = (max: number) => `Must be at most ${max} characters`;
export const requiredOr = (message: string) => (iss: { input?: unknown }) =>
  iss.input === undefined || iss.input === null ? 'Required' : message;

/** Required, trimmed, non-empty string. */
export const requiredText = (max: number) =>
  z
    .string({ error: requiredOr('Must be a string') })
    .trim()
    .min(1, 'Required')
    .max(max, tooLong(max));

/** Optional string. Missing, null and blank-after-trim all become `null`. */
export const nullableText = (max: number) =>
  z
    .string({ error: 'Must be a string' })
    .trim()
    .max(max, tooLong(max))
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

export const nullableEmail = (max = 254) =>
  nullableText(max).refine((v) => v === null || z.email().safeParse(v).success, 'Must be a valid email');

export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const nullableHttpUrl = (max: number) =>
  nullableText(max).refine((v) => v === null || isHttpUrl(v), 'Must be an http:// or https:// URL');

/** Finite JSON number in [min, 1e9] with at most `decimals` decimal places. */
export const decimal = (decimals: number, { min = 0, exclusiveMin = false } = {}) =>
  z
    .number({ error: requiredOr('Must be a number') })
    .refine((n) => (exclusiveMin ? n > min : n >= min), exclusiveMin ? `Must be greater than ${min}` : `Must be at least ${min}`)
    .refine((n) => n <= MAX_NUMBER, `Must be at most ${MAX_NUMBER}`)
    .refine((n) => hasAtMostDecimals(n, decimals), `Must have at most ${decimals} decimal places`);

export const foreignId = () =>
  z
    .number({ error: requiredOr('Must be an integer id') })
    .int('Must be an integer id')
    .positive('Must be a positive integer id');

export const bool = () => z.boolean({ error: requiredOr('Must be true or false') });

/** Parses a `:id` route param. Anything other than a positive integer is a 404. */
export function parseId(raw: unknown): number {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw)) throw notFound();
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw notFound();
  return id;
}

/** Throws 400 unless the request body is a JSON object. */
export function requireObjectBody(body: unknown): Record<string, unknown> {
  if (body === undefined) return {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

/**
 * Builds the merged record for a PUT: current writable values, overridden by
 * the writable fields present in the body. Everything else in the body is ignored.
 */
export function mergeForUpdate(
  current: object,
  body: Record<string, unknown>,
  writableFields: readonly string[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const field of writableFields) {
    merged[field] = Object.hasOwn(body, field) ? body[field] : (current as Record<string, unknown>)[field];
  }
  return merged;
}
