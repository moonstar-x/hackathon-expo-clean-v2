import jwt from 'jsonwebtoken';
import { unauthorized } from '../lib/errors.js';

/** Signs a session token for `email`. Returns the token and its expiry as an ISO string. */
export function signToken(email, config) {
  const token = jwt.sign({ sub: email }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Requires `Authorization: Bearer <jwt>`. On success sets `req.user = { email }`.
 * Tokens for anyone other than the configured admin are rejected, so changing
 * ADMIN_EMAIL invalidates old sessions.
 */
export function requireAuth(config) {
  return (req, _res, next) => {
    const header = req.get('authorization');
    if (!header) return next(unauthorized('Missing Authorization header'));

    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) return next(unauthorized('Authorization header must be "Bearer <token>"'));

    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      return next(unauthorized(err instanceof jwt.TokenExpiredError ? 'Session expired, please log in again' : 'Invalid token'));
    }

    if (typeof payload?.sub !== 'string' || payload.sub.toLowerCase() !== config.adminEmail.toLowerCase()) {
      return next(unauthorized('Invalid token'));
    }
    req.user = { email: payload.sub };
    next();
  };
}
