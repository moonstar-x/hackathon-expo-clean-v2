import crypto from 'node:crypto';
import express from 'express';
import type { AppDeps } from '../../app.ts';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { invalidCredentials, rateLimited } from '../../lib/errors.ts';
import { hashPassword, verifyPassword } from '../../lib/password.ts';
import { requireObjectBody } from '../../lib/validation.ts';
import { requireAuth, signToken } from '../../middleware/auth.ts';
import { createUsersRepository } from '../users/repository.ts';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const loginSchema = z.object({
  email: z.string({ error: (iss) => (iss.input == null ? 'Required' : 'Must be a string') }).trim().min(1, 'Required'),
  password: z.string({ error: (iss) => (iss.input == null ? 'Required' : 'Must be a string') }).min(1, 'Required'),
});

// A real hash of a random password. Unknown emails are checked against it, so they
// take as long as a wrong password and the response time does not reveal which
// emails have accounts. Computed once per process.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(crypto.randomBytes(32).toString('hex')));

export function authRouter({ config, db }: AppDeps) {
  const router = express.Router();
  const users = createUsersRepository(db);
  getDummyHash();

  // Created per app so every test app starts with a fresh limiter.
  const loginLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: LOGIN_MAX_ATTEMPTS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(rateLimited()),
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(requireObjectBody(req.body));

    const user = users.findCredentials(email);
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    // Unknown email, wrong password and deactivated account all get the same answer.
    if (!user || !passwordOk || !user.active) throw invalidCredentials();

    users.recordLogin(user.id);
    const { token, expiresAt } = signToken(user, config);
    res.json({ token, expiresAt, user: { id: user.id, email: user.email, name: user.name } });
  });

  router.get('/me', requireAuth({ config, db }), (req, res) => {
    res.json(req.user);
  });

  return router;
}
