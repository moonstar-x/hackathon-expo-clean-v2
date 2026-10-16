import { z } from 'zod';
import { badRequest, notFound } from './errors.js';
import { hasAtMostDecimals, MAX_NUMBER } from './numbers.js';

// Shared zod building blocks so every resource reports errors the same way.

const tooLong = (max) => `Must be at most ${max} characters`;
const requiredOr = (message) => (iss) => (iss.input === undefined || iss.input === null ? 'Required' : message);

/** Required, trimmed, non-empty string. */
export const requiredText = (max) =>
  z
    .string({ error: requiredOr('Must be a string') })
    .trim()
    .min(1, 'Required')
    .max(max, tooLong(max));

/** Optional string. Missing, null and blank-after-trim all become `null`. */
export const nullableText = (max) =>
  z
    .string({ error: 'Must be a string' })
    .trim()
    .max(max, tooLong(max))
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

export const nullableEmail = (max = 254) =>
  nullableText(max).refine((v) => v === null || z.email().safeParse(v).success, 'Must be a valid email');

export const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const nullableHttpUrl = (max) =>
  nullableText(max).refine((v) => v === null || isHttpUrl(v), 'Must be an http:// or https:// URL');

/** Finite JSON number in [min, 1e9] with at most `decimals` decimal places. */
export const decimal = (decimals, { min = 0, exclusiveMin = false } = {}) =>
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
export function parseId(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw)) throw notFound();
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw notFound();
  return id;
}

/** Throws 400 unless the request body is a JSON object. */
export function requireObjectBody(body) {
  if (body === undefined) return {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body;
}

/**
 * Builds the merged record for a PUT: current writable values, overridden by
 * the writable fields present in the body. Everything else in the body is ignored.
 */
export function mergeForUpdate(current, body, writableFields) {
  const merged = {};
  for (const field of writableFields) {
    merged[field] = Object.hasOwn(body, field) ? body[field] : current[field];
  }
  return merged;
}
