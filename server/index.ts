import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
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
app.use(cookieParser());
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

app.get('/', (req: Request, res: Response) => {
  const acceptsHtml = req.accepts('html');
  const clientIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  const expoIndex = path.resolve(process.cwd(), 'expo-app', 'dist', 'index.html');
  const targetHtml = [clientIndex, expoIndex].find((p) => fs.existsSync(p));

  if (acceptsHtml && targetHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(targetHtml);
  }

  res.json({
    success: true,
    message: 'server is live',
    health: '/api/health',
  });
});

// PWA Manifest and Root Asset Delivery
app.get('/manifest.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const manifestExpo = path.resolve(process.cwd(), 'expo-app', 'public', 'manifest.json');
  const manifestPublic = path.resolve(process.cwd(), 'public', 'manifest.json');
  const manifestDist = path.resolve(process.cwd(), 'dist', 'manifest.json');

  const target = [manifestExpo, manifestPublic, manifestDist].find((p) => fs.existsSync(p));
  if (target) {
    res.sendFile(target);
  } else {
    res.status(404).json({ error: 'manifest.json not found' });
  }
});

app.get('/apple-touch-icon.png', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const iconExpo = path.resolve(process.cwd(), 'expo-app', 'public', 'apple-touch-icon.png');
  const iconPublic = path.resolve(process.cwd(), 'public', 'apple-touch-icon.png');
  const iconDist = path.resolve(process.cwd(), 'dist', 'apple-touch-icon.png');

  const target = [iconExpo, iconPublic, iconDist].find((p) => fs.existsSync(p));
  if (target) {
    res.sendFile(target);
  } else {
    res.status(404).send('Icon not found');
  }
});

app.use('/icons', express.static(path.resolve(process.cwd(), 'public', 'icons')));
app.use('/icons', express.static(path.resolve(process.cwd(), 'expo-app', 'public', 'icons')));
app.use(express.static(path.resolve(process.cwd(), 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.use('/api', generalRateLimiter, apiRouter);

import { getUploadedFile } from './controllers/uploadController';
import { renderProductPreview, renderProductPreviewImage } from './controllers/productPreviewController';

// Dynamic Open Graph HTML preview routes for WhatsApp, Facebook, Twitter and social crawlers
app.get('/product/:id', renderProductPreview);
app.get('/p/:id', renderProductPreview);
app.get('/share/product/:id', renderProductPreview);
app.get('/product/:id/image', renderProductPreviewImage);
app.get('/p/:id/image', renderProductPreviewImage);

// Web Push Service Worker delivery with root scope permission
app.get('/sw.js', (_req: Request, res: Response) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const swPathExpo = path.resolve(process.cwd(), 'expo-app', 'public', 'sw.js');
  const swPathPublic = path.resolve(process.cwd(), 'public', 'sw.js');
  const swPathDist = path.resolve(process.cwd(), 'expo-app', 'dist', 'sw.js');

  const targetPath = [swPathExpo, swPathPublic, swPathDist].find((p) => fs.existsSync(p));
  if (targetPath) {
    res.sendFile(targetPath);
  } else {
    res.status(404).send('// Service worker not found');
  }
});

// Persistent file delivery: serves from local disk first, or streams from MongoDB GridFS if on ephemeral host
app.get('/uploads/:filename', getUploadedFile);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads')));
app.use('/.well-known', express.static(path.resolve(process.cwd(), 'public', '.well-known')));

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
