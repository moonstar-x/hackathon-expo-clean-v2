import type { RequestHandler } from 'express';
import { notFound } from '../lib/errors.ts';

/** Final catch-all: any route nobody handled is a 404 in the API error format. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.path} not found`));
};
