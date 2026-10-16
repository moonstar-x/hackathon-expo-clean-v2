/**
 * An error that maps directly onto the API error format:
 * `{ message, code, errors? }` with the given HTTP status.
 */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {Record<string, string>} [errors] field name → message
   */
  constructor(status, code, message, errors) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (errors && Object.keys(errors).length > 0) this.errors = errors;
  }

  toJSON() {
    return { message: this.message, code: this.code, ...(this.errors ? { errors: this.errors } : {}) };
  }
}

export const badRequest = (message) => new HttpError(400, 'BAD_REQUEST', message);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, 'UNAUTHORIZED', message);
export const invalidCredentials = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
export const notFound = (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message);
export const methodNotAllowed = (message = 'Method not allowed') => new HttpError(405, 'METHOD_NOT_ALLOWED', message);
export const conflict = (message, errors) => new HttpError(409, 'CONFLICT', message, errors);
export const insufficientStock = (message) => new HttpError(409, 'INSUFFICIENT_STOCK', message, { quantity: message });
export const validationError = (errors, message = 'Validation failed') =>
  new HttpError(422, 'VALIDATION_ERROR', message, errors);
export const rateLimited = (message = 'Too many login attempts, please try again later') =>
  new HttpError(429, 'RATE_LIMITED', message);
