import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError, type z } from 'zod';
import type { Config } from '../config.ts';
import { type FieldErrors, HttpError } from '../lib/errors.ts';

/** Turns zod issues into `{ field: firstMessage }`, joining nested paths with `.`. */
export function zodIssuesToErrors(issues: readonly z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join('.');
    if (field && !Object.hasOwn(errors, field)) errors[field] = issue.message;
  }
  return errors;
}

/** The fields body-parser and http-errors set on the errors they throw. */
type ExpressError = { type?: string; expose?: boolean; status?: number; message?: string };

function toHttpError(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err;

  if (err instanceof multer.MulterError) {
    const large = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE'].includes(err.code);
    return new HttpError(large ? 413 : 400, large ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', large ? 'Measurement part is too large' : 'Invalid multipart body', err.field ? { [err.field]: err.message } : undefined);
  }

  if (err instanceof ZodError) {
    const errors = zodIssuesToErrors(err.issues);
    const rootIssue = err.issues.find((i) => i.path.length === 0);
    const message = rootIssue && Object.keys(errors).length === 0 ? `Invalid request body: ${rootIssue.message}` : 'Validation failed';
    return new HttpError(422, 'VALIDATION_ERROR', message, errors);
  }

  // body-parser errors (malformed JSON, payload too large, bad charset, ...)
  const e = err as ExpressError | null | undefined;
  if (e?.type === 'entity.parse.failed') return new HttpError(400, 'BAD_REQUEST', 'Malformed JSON in request body');
  if (e?.type === 'entity.too.large') return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (e?.expose && typeof e.status === 'number' && Number.isInteger(e.status) && e.status >= 400 && e.status < 500) {
    return new HttpError(e.status, 'BAD_REQUEST', e.message ?? '');
  }

  return null;
}

/** Maps every error to the API error format. Unknown errors become a logged 500. */
export function errorHandler(config: Config): ErrorRequestHandler {
  // Express recognises error middleware by its four parameters.
  return (err: unknown, req, res, _next) => {
    const httpError = toHttpError(err);
    if (httpError) {
      if (httpError.status >= 500) req.log?.error({ err }, 'request failed');
      return res.status(httpError.status).json(httpError.toJSON());
    }

    req.log?.error({ err }, 'unhandled error');
    const body: { message: string; code: string; stack?: string } = { message: 'Internal server error', code: 'INTERNAL_ERROR' };
    if (!config.isProduction && err instanceof Error) {
      body.message = err.message || body.message;
      body.stack = err.stack;
    }
    res.status(500).json(body);
  };
}
