import path from 'node:path';
import { isIP } from 'node:net';
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

const proxyValue = (value: string): boolean | number | string[] | undefined => {
  if (value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))) return Number(value);
  const entries = value.split(',').map((s) => s.trim());
  if (entries.every((entry) => {
    if (['loopback', 'linklocal', 'uniquelocal'].includes(entry)) return true;
    const [address, bits, extra] = entry.split('/');
    const family = isIP(address);
    return family !== 0 && extra === undefined && (bits === undefined || (/^\d+$/.test(bits) && Number(bits) <= (family === 4 ? 32 : 128)));
  })) return entries;
  return undefined;
};
const validPublicUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && !value.includes('?') && !value.includes('#');
  } catch { return false; }
};

const schema = z
  .object({
    NODE_ENV: env(z.enum(['development', 'test', 'production']).default('development')),
    PORT: env(z.coerce.number().int().min(1).max(65535).default(4000)),
    PUBLIC_URL: env(z.string().trim().refine(validPublicUrl, 'must be an absolute http(s) URL without credentials, query or fragment').optional()),
    TRUST_PROXY: env(z.string().trim().default('false').refine((v) => proxyValue(v) !== undefined, 'must be a boolean, hop count, or trusted address/subnet list').transform(proxyValue)),
    UPLOAD_MAX_FILE_MB: env(z.coerce.number().int().min(1).max(500).default(50)),
    DATABASE_PATH: env(z.string().trim().default('./data/inventory.db')),
    FILES_PATH: env(z.string().trim().default('./data/files')),
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
    QUOTE_DOCUMENT_TIMEZONE: env(z.string().default('America/Guayaquil').refine((v) => { try { new Intl.DateTimeFormat('es', { timeZone: v }); return true; } catch { return false; } }, 'must be a valid IANA timezone')),
    QUOTE_WORKER: env(z.enum(['on','off']).default('on')),
    QUOTE_WORKER_POLL_MS: env(z.coerce.number().int().min(100).max(60000).default(1000)),
    QUOTE_JOB_MAX_ATTEMPTS: env(z.coerce.number().int().min(1).max(20).default(5)),
    // TDR documents (SPEC-009): read with Claude Haiku through OpenRouter. Without a key, analyses fail with a clear reason.
    OPENROUTER_API_KEY: env(z.string().trim().optional()),
    OPENROUTER_MODEL: env(z.string().trim().regex(/^[\w.~:/-]+$/, 'must be an OpenRouter model id such as anthropic/claude-haiku-5.5').default('anthropic/claude-haiku-5.5')),
    TDR_WORKER: env(z.enum(['on','off']).default('on')),
    LOG_LEVEL: env(z.enum(LOG_LEVELS).default('info')),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;
    if (!cfg.PUBLIC_URL || !cfg.PUBLIC_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['PUBLIC_URL'], message: 'is required and must use https in production' });
    }
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
    publicUrl: (e.PUBLIC_URL ?? `http://localhost:${e.PORT}`).replace(/\/+$/, ''),
    trustProxy: e.TRUST_PROXY,
    uploadMaxFileBytes: e.UPLOAD_MAX_FILE_MB * 1024 * 1024,
    databasePath,
    /** Folder for uploaded files kept outside the database (the company logo and electronic signature). */
    filesPath: path.resolve(API_ROOT, e.FILES_PATH),
    corsOrigins: Object.freeze(e.CORS_ORIGIN),
    jwtSecret: e.JWT_SECRET,
    jwtExpiresIn: e.JWT_EXPIRES_IN,
    adminEmail: e.ADMIN_EMAIL,
    adminPassword: e.ADMIN_PASSWORD,
    logLevel: e.LOG_LEVEL,
    quoteDocumentTimezone: e.QUOTE_DOCUMENT_TIMEZONE,
    quoteWorker: e.QUOTE_WORKER,
    quoteWorkerPollMs: e.QUOTE_WORKER_POLL_MS,
    quoteJobMaxAttempts: e.QUOTE_JOB_MAX_ATTEMPTS,
    openRouterApiKey: e.OPENROUTER_API_KEY ?? null,
    openRouterModel: e.OPENROUTER_MODEL,
    tdrWorker: e.TDR_WORKER,
  });
}

export type Config = ReturnType<typeof loadConfig>;
