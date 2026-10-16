import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

/** Turns zod issues into `{ field: firstMessage }`, joining nested paths with `.`. */
export function zodIssuesToErrors(issues) {
  const errors = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join('.');
    if (field && !Object.hasOwn(errors, field)) errors[field] = issue.message;
  }
  return errors;
}

function toHttpError(err) {
  if (err instanceof HttpError) return err;

  if (err instanceof ZodError) {
    const errors = zodIssuesToErrors(err.issues);
    const rootIssue = err.issues.find((i) => i.path.length === 0);
    const message = rootIssue && Object.keys(errors).length === 0 ? `Invalid request body: ${rootIssue.message}` : 'Validation failed';
    return new HttpError(422, 'VALIDATION_ERROR', message, errors);
  }

  // body-parser errors (malformed JSON, payload too large, bad charset, ...)
  if (err?.type === 'entity.parse.failed') return new HttpError(400, 'BAD_REQUEST', 'Malformed JSON in request body');
  if (err?.type === 'entity.too.large') return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err?.expose && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return new HttpError(err.status, 'BAD_REQUEST', err.message);
  }

  return null;
}

/** Maps every error to the API error format. Unknown errors become a logged 500. */
export function errorHandler(config) {
  // Express recognises error middleware by its four parameters.
  return (err, req, res, _next) => {
    const httpError = toHttpError(err);
    if (httpError) {
      if (httpError.status >= 500) req.log?.error({ err }, 'request failed');
      return res.status(httpError.status).json(httpError.toJSON());
    }

    req.log?.error({ err }, 'unhandled error');
    const body = { message: 'Internal server error', code: 'INTERNAL_ERROR' };
    if (!config.isProduction && err instanceof Error) {
      body.message = err.message || body.message;
      body.stack = err.stack;
    }
    res.status(500).json(body);
  };
}
