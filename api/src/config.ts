import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

/** Absolute path of the `api/` folder. Relative paths in the config resolve against it. */
export const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Values shipped in `.env.example`. They are rejected in production. */
export const PLACEHOLDERS = Object.freeze({
  JWT_SECRET: 'replace-with-a-long-random-string-of-32-plus-chars',
  ADMIN_PASSWORD: 'change-me-please',
});

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

// `.env` files often contain `KEY=` for "unset"; treat empty strings as missing.
const env = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);
const required = (iss: { input?: unknown }) => (iss.input === undefined ? 'is required' : undefined);

const isHttpOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
};

const isJwtDuration = (value: string) => {
  try {
    jwt.sign({}, 'duration-check', { expiresIn: value as SignOptions['expiresIn'] });
    return true;
  } catch {
    return false;
  }
};

const schema = z
  .object({
    NODE_ENV: env(z.enum(['development', 'test', 'production']).default('development')),
    PORT: env(z.coerce.number().int().min(1).max(65535).default(4000)),
    DATABASE_PATH: env(z.string().trim().default('./data/inventory.db')),
    CORS_ORIGIN: env(
      z
        .string({ error: required })
        .transform((v) => v.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean))
        .refine((list) => list.length > 0, 'must list at least one origin')
        .refine((list) => list.every(isHttpOrigin), 'must be a comma-separated list of http(s) origins'),
    ),
    JWT_SECRET: env(z.string({ error: required }).min(32, 'must be at least 32 characters')),
    JWT_EXPIRES_IN: env(
      z.string().trim().default('8h').refine(isJwtDuration, 'must be a duration such as 30m, 8h or 7d'),
    ),
    ADMIN_EMAIL: env(z.string({ error: required }).trim().pipe(z.email('must be a valid email'))),
    // Same limits as any user password (modules/users/schemas.ts).
    ADMIN_PASSWORD: env(
      z.string({ error: required }).min(8, 'must be at least 8 characters').max(128, 'must be at most 128 characters'),
    ),
    LOG_LEVEL: env(z.enum(LOG_LEVELS).default('info')),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;
    for (const key of ['JWT_SECRET', 'ADMIN_PASSWORD'] as const) {
      if (cfg[key] === PLACEHOLDERS[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'must be changed from the .env.example placeholder in production' });
      }
    }
  });

export interface ConfigProblem {
  variable: string;
  message: string;
}

export class ConfigError extends Error {
  problems: ConfigProblem[];

  constructor(problems: ConfigProblem[]) {
    const lines = problems.map((p) => `  - ${p.variable} ${p.message}`);
    super(`Invalid environment configuration:\n${lines.join('\n')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

/**
 * Validates environment variables and returns a frozen config object.
 * Throws a ConfigError that names every invalid or missing variable.
 */
export function loadConfig(source: Record<string, string | undefined> = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => ({
      variable: String(issue.path[0] ?? 'environment'),
      message: issue.message,
    }));
    throw new ConfigError(problems);
  }

  const e = result.data;
  const databasePath = e.DATABASE_PATH === ':memory:' ? ':memory:' : path.resolve(API_ROOT, e.DATABASE_PATH);

  return Object.freeze({
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    port: e.PORT,
    databasePath,
    corsOrigins: Object.freeze(e.CORS_ORIGIN),
    jwtSecret: e.JWT_SECRET,
    jwtExpiresIn: e.JWT_EXPIRES_IN,
    adminEmail: e.ADMIN_EMAIL,
    adminPassword: e.ADMIN_PASSWORD,
    logLevel: e.LOG_LEVEL,
  });
}

export type Config = ReturnType<typeof loadConfig>;
