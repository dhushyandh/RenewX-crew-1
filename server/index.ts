import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { handleRazorpayWebhook } from './controllers/orderController';

const app = express();

const allowedOrigins = new Set(env.CORS_ORIGINS.filter((origin) => origin !== '*'));
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.CORS_ORIGINS.includes('*') || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
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
app.use(cors(corsOptions));

/*
 * Razorpay signs the exact raw request body.
 * This route MUST stay before express.json().
 */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleRazorpayWebhook,
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

app.use('/api', apiRouter);

// This is suitable for local development only.
// Vercel does not provide persistent local disk storage.
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
