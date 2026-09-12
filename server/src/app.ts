import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env, isProd, isTest } from './config/env.js';
import { logger } from './config/logger.js';
import { passport } from './config/passport.js';
import { requestIdMiddleware, getRequestId } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './modules/health/routes.js';
import { authRouter } from './modules/auth/routes.js';
import { filesRouter } from './modules/files/routes.js';
import { publicRouter } from './modules/public/routes.js';
import { testOnlyRouter } from './modules/testOnly/routes.js';

/**
 * App factory (not a bootstrapped singleton) so tests can import this
 * directly with supertest, without needing a listening port or a real DB
 * connection at import time.
 */
export function createApp(): Express {
  const app = express();

  // Required on Render/any reverse-proxy host: without this, Express thinks
  // every connection is plain HTTP, so `cookie.secure = true` sessions are
  // silently dropped AND express-rate-limit buckets every visitor into one
  // shared IP (the proxy's).
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Google profile avatars + our own S3/local-served thumbnails.
          imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com', 'https://*.amazonaws.com'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: [env.WEB_ORIGIN, 'http://localhost:5173'],
      credentials: true,
    }),
  );

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: () => getRequestId() ?? randomUUID(),
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    session({
      name: isProd ? '__Secure-drive.sid' : 'drive.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      // Reuses mongoose's existing connection/client rather than opening a
      // second Mongo connection pool for sessions — also what keeps the
      // test suite from leaking a connection per createApp() call.
      store: MongoStore.create({
        client: mongoose.connection.getClient() as never,
        ttl: 7 * 24 * 60 * 60,
      }),
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        // MUST be undefined on localhost — a Domain attribute on a
        // non-matching host makes the browser refuse to set the cookie.
        domain: env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(globalLimiter);

  app.use(healthRouter); // defines both /healthz and /readyz itself
  app.use('/api/auth', authRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/public', publicRouter);

  // NEVER mounted outside NODE_ENV=test — see modules/testOnly/routes.ts.
  if (isTest) {
    app.use('/__test__', testOnlyRouter);
  }

  // Single-origin deploy option: if a built frontend bundle has been placed
  // at server/public (see the repo-root Dockerfile), serve it directly from
  // this same Express process instead of standing up a separate static
  // host. This is what lets the whole app run as ONE Render service on its
  // default *.onrender.com URL with no custom domain — onrender.com is on
  // the public suffix list, so two separate onrender.com services would be
  // cross-site to each other and need SameSite=None cookies; serving both
  // from one origin sidesteps that entirely. In dev, or in the split
  // Vercel+Render deploy, this directory simply doesn't exist and nothing
  // here changes.
  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    // A RegExp route (not a string pattern) so this sidesteps Express 5's
    // path-to-regexp changes entirely — matches any GET that isn't already
    // handled above, so a client-side route like /drive/<id> or /s/<token>
    // still resolves to index.html on a hard refresh.
    app.get(/^\/(?!api\/|healthz$|readyz$|__test__\/).*/, (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
