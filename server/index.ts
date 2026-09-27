import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import mongoose from 'mongoose';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { handleRazorpayWebhook } from './controllers/orderController';
import { generalRateLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/db';

const app = express();

// Enable reverse proxy support (Render, Vercel, AWS ALB, Nginx, Cloudflare)
// so req.ip and express-rate-limit correctly identify client IPs instead of the load balancer.
app.set('trust proxy', 1);

if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.includes('*')) {
  throw new Error('CORS_ORIGIN must be explicitly configured in production');
}

const allowedOrigins = new Set(env.CORS_ORIGINS.filter((origin) => origin !== '*'));

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin || origin === 'null') return true;
  if (env.CORS_ORIGINS.includes('*')) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    if (
      host.endsWith('.expo.app') ||
      host === 'expo.app' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.onrender.com') ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return true;
    }
  } catch {
    // malformed origin
  }
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Idempotency-Key',
  ],
};

app.disable('x-powered-by');

// Security headers with permissive resource policy for cross-origin mobile assets
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// Gzip/Brotli compression for all JSON and static payloads
app.use(compression());

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Ensure database connection is active using warm mongoose connection pool
app.use(async (_req, _res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (error) {
    next(error);
  }
});

/*
 * Razorpay signs the exact raw request body.
 * This route MUST stay before express.json().
 */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleRazorpayWebhook,
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    if (env.NODE_ENV !== 'test') {
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`,
      );
    }
  });

  next();
});

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'server is live',
    health: '/api/health',
  });
});

app.use('/api', generalRateLimiter, apiRouter);

import { getUploadedFile } from './controllers/uploadController';

// Persistent file delivery: serves from local disk first, or streams from MongoDB GridFS if on ephemeral host
app.get('/uploads/:filename', getUploadedFile);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads')));

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
});

app.use(errorHandler);

export default app;
