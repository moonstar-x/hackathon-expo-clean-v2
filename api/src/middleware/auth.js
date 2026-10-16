import jwt from 'jsonwebtoken';
import { unauthorized } from '../lib/errors.js';
import { createUsersRepository } from '../modules/users/repository.js';

/** Signs a session token for `user` (`sub` = user id). Returns the token and its expiry as an ISO string. */
export function signToken(user, config) {
  const token = jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
    subject: String(user.id),
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Requires `Authorization: Bearer <jwt>`. On success sets `req.user = { id, email, name }`.
 * The user is loaded on every request, so deleting or deactivating an account ends
 * its sessions immediately, and `req.user.email` always reflects the current email.
 */
export function requireAuth({ config, db }) {
  const users = createUsersRepository(db);

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

    const id = typeof payload?.sub === 'string' && /^[1-9]\d{0,15}$/.test(payload.sub) ? Number(payload.sub) : null;
    const user = id === null ? null : users.findById(id);
    if (!user?.active) return next(unauthorized('Invalid token'));

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  };
}
