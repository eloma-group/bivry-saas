import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import { globalLimiter } from './middleware/rateLimiter.middleware';
import { ApiError } from './utils/apiError';

const app = express();

// Behind Azure App Service / Nginx the real client IP arrives in X-Forwarded-For,
// which the rate limiter and the login audit both rely on. One hop, because only
// the App Service front end sits in front of this process.
//
// Azure puts the client's source port in that header as well, so `req.ip` reads
// "223.235.28.15:56907". Never use it directly - utils/clientIp normalises it,
// and both the limiter and the audit go through there.
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  [
    env.frontendUrl,
    ...env.extraOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      // Same origin requests and tools like curl send no origin header.
      if (!origin) return callback(null, true);
      if (!env.isProduction || allowedOrigins.has(origin)) return callback(null, true);
      // An ApiError rather than a plain Error, so a browser hitting the API from
      // an origin we do not serve gets a 403 it can be told apart from a real
      // fault. A plain Error lands in the error handler as a 500 and pollutes
      // the metrics that are supposed to mean "the API is broken".
      return callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Cache the preflight so the browser stops re-asking on every upload.
    maxAge: 86400,
  }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(globalLimiter);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'BIVRY SaaS API',
    version: '1.0.0',
    portals: ['admin', 'customer', 'vendor', 'employee', 'driver'].map(
      (role) => `/api/auth/${role}`,
    ),
    health: '/api/health',
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
