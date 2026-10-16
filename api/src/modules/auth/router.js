import crypto from 'node:crypto';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { invalidCredentials, rateLimited } from '../../lib/errors.js';
import { requireObjectBody } from '../../lib/validation.js';
import { requireAuth, signToken } from '../../middleware/auth.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const loginSchema = z.object({
  email: z.string({ error: (iss) => (iss.input == null ? 'Required' : 'Must be a string') }).trim().min(1, 'Required'),
  password: z.string({ error: (iss) => (iss.input == null ? 'Required' : 'Must be a string') }).min(1, 'Required'),
});

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest();

/** Constant-time comparison: both sides are hashed first so lengths always match. */
export function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

export function authRouter({ config }) {
  const router = express.Router();

  // Created per app so every test app starts with a fresh limiter.
  const loginLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: LOGIN_MAX_ATTEMPTS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(rateLimited()),
  });

  router.post('/login', loginLimiter, (req, res) => {
    const { email, password } = loginSchema.parse(requireObjectBody(req.body));

    // Evaluate both checks so the response time does not reveal which field was wrong.
    const emailOk = safeEqual(email.toLowerCase(), config.adminEmail.toLowerCase());
    const passwordOk = safeEqual(password, config.adminPassword);
    if (!(emailOk && passwordOk)) throw invalidCredentials();

    const { token, expiresAt } = signToken(config.adminEmail, config);
    res.json({ token, expiresAt, user: { email: config.adminEmail } });
  });

  router.get('/me', requireAuth(config), (req, res) => {
    res.json({ email: req.user.email });
  });

  return router;
}
