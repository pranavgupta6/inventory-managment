import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { getCorsOrigins, env } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { healthRouter } from './modules/health/health.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { assignmentsRouter } from './modules/assignments/assignments.routes.js';
import { requestsRouter } from './modules/requests/requests.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';

// ---------------------------------------------------------------------------
// Application factory
// ---------------------------------------------------------------------------

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = getCorsOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman in development)
        if (!origin) {
          callback(null, true);
          return;
        }
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (allowedOrigins.includes(origin) || (env.NODE_ENV === 'development' && isLocalhost)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} is not allowed`));
        }
      },
      credentials: true,
    }),
  );

  // ── Request parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Structured request logging ────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });
  app.use('/api', limiter);

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api', healthRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/audit', auditRouter);

  // ── 404 handler — must come after all routes ──────────────────────────────
  app.use(notFoundHandler);

  // ── Centralized error handler — must be last ──────────────────────────────
  app.use(errorHandler);

  return app;
}
