import type Database from 'better-sqlite3';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.ts';
import { requireAuth } from './middleware/auth.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { notFoundHandler } from './middleware/notFound.ts';
import { authRouter } from './modules/auth/router.ts';
import { categoriesRouter } from './modules/categories/router.ts';
import { measurementsRouter } from './modules/measurements/router.ts';
import { productsRouter } from './modules/products/router.ts';
import { statsRouter } from './modules/stats/router.ts';
import { stockMovementsRouter } from './modules/stockMovements/router.ts';
import { suppliersRouter } from './modules/suppliers/router.ts';
import { quotesRouter } from './modules/quotes/router.ts';
import { settingsRouter } from './modules/quotes/settings.ts';
import { usersRouter } from './modules/users/router.ts';

/** Paths never written to logs: credentials and tokens. */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'body.password',
  'req.body.password',
  'token',
  '*.token',
];

/** What every router and middleware factory receives. */
export interface AppDeps {
  db: Database.Database;
  config: Config;
}

export function createLogger(config: Config): Logger {
  return pino({
    level: config.env === 'test' ? 'silent' : config.logLevel,
    redact: { paths: LOG_REDACT_PATHS, censor: '[REDACTED]' },
  });
}

/** Builds the Express app. Does not listen, so tests can drive it with supertest. */
export function createApp({ db, config, logger = createLogger(config), nudgeQuotes = () => {} }: AppDeps & { logger?: Logger; nudgeQuotes?: () => void }) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: [...config.corsOrigins],
      exposedHeaders: ['Content-Range', 'Content-Disposition', 'Location'],
      // ra-data-simple-rest sends `Range: <resource>=<start>-<end>` on every getList.
      // It is not a CORS-safelisted header, so the preflight must allow it.
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok', db: 'ok' });
    } catch (err) {
      req.log.error({ err }, 'health check: database unavailable');
      res.status(503).json({ status: 'error', db: 'error' });
    }
  });

  const deps: AppDeps = { db, config };
  app.use('/api/auth', authRouter(deps));

  const api = express.Router();
  api.use(requireAuth(deps));
  api.use(settingsRouter(deps));
  api.use(quotesRouter(deps,nudgeQuotes));
  api.use('/measurements', measurementsRouter(deps,nudgeQuotes));
  api.use('/categories', categoriesRouter(deps));
  api.use('/suppliers', suppliersRouter(deps));
  api.use('/products', productsRouter(deps));
  api.use('/stock-movements', stockMovementsRouter(deps));
  api.use('/stats', statsRouter(deps));
  api.use('/users', usersRouter(deps));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler(config));
  return app;
}
