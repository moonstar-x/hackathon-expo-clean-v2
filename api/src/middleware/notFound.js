import { notFound } from '../lib/errors.js';

/** Final catch-all: any route nobody handled is a 404 in the API error format. */
export function notFoundHandler(req, _res, next) {
  next(notFound(`Route ${req.method} ${req.path} not found`));
}
