import type { RequestHandler } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { AppDeps } from '../app.ts';
import type { Config } from '../config.ts';
import { unauthorized } from '../lib/errors.ts';
import { createUsersRepository } from '../modules/users/repository.ts';

/** The authenticated caller, as set on `req.user` by `requireAuth`. */
export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Signs a session token for `user` (`sub` = user id). Returns the token and its expiry as an ISO string. */
export function signToken(user: { id: number }, config: Config): { token: string; expiresAt: string } {
  const token = jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    // loadConfig has already checked that this is a valid duration.
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
    subject: String(user.id),
  });
  const { exp } = jwt.decode(token) as JwtPayload & { exp: number };
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Requires `Authorization: Bearer <jwt>`. On success sets `req.user = { id, email, name }`.
 * The user is loaded on every request, so deleting or deactivating an account ends
 * its sessions immediately, and `req.user.email` always reflects the current email.
 */
export function requireAuth({ config, db }: AppDeps): RequestHandler {
  const users = createUsersRepository(db);

  return (req, _res, next) => {
    const header = req.get('authorization');
    if (!header) return next(unauthorized('Missing Authorization header'));

    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) return next(unauthorized('Authorization header must be "Bearer <token>"'));

    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      return next(unauthorized(err instanceof jwt.TokenExpiredError ? 'Session expired, please log in again' : 'Invalid token'));
    }

    const sub = typeof payload === 'string' ? undefined : payload.sub;
    const id = typeof sub === 'string' && /^[1-9]\d{0,15}$/.test(sub) ? Number(sub) : null;
    const user = id === null ? null : users.findById(id);
    if (!user?.active) return next(unauthorized('Invalid token'));

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  };
}
