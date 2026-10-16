import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { authRouter } from './modules/auth/router.js';
import { categoriesRouter } from './modules/categories/router.js';
import { productsRouter } from './modules/products/router.js';
import { statsRouter } from './modules/stats/router.js';
import { stockMovementsRouter } from './modules/stockMovements/router.js';
import { suppliersRouter } from './modules/suppliers/router.js';
import { usersRouter } from './modules/users/router.js';

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

export function createLogger(config) {
  return pino({
    level: config.env === 'test' ? 'silent' : config.logLevel,
    redact: { paths: LOG_REDACT_PATHS, censor: '[REDACTED]' },
  });
}

/**
 * Builds the Express app. Does not listen, so tests can drive it with supertest.
 * @param {{ db: import('better-sqlite3').Database, config: ReturnType<import('./config.js').loadConfig>, logger?: import('pino').Logger }} deps
 */
export function createApp({ db, config, logger = createLogger(config) }) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: [...config.corsOrigins],
      exposedHeaders: ['Content-Range'],
      // ra-data-simple-rest sends `Range: <resource>=<start>-<end>` on every getList.
      // It is not a CORS-safelisted header, so the preflight must allow it.
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok', db: 'ok' });
    } catch (err) {
      req.log.error({ err }, 'health check: database unavailable');
      res.status(503).json({ status: 'error', db: 'error' });
    }
  });

  const deps = { db, config };
  app.use('/api/auth', authRouter(deps));

  const api = express.Router();
  api.use(requireAuth(deps));
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
