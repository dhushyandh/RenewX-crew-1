import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// 1. Production CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman) or matched origin
    if (!origin || env.CORS_ORIGIN === '*' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for mobile & web clients
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// 2. Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Request logger (minimal production logging)
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// 4. Mount Master API Router & Static Uploads
app.use('/api', apiRouter);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads')));

// Root Welcome Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'RenewX Certified Hardware Store API is running',
    documentation: '/api/health',
    version: '1.0.0',
  });
});

// 5. 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
});

import { connectDB } from './config/db';

// 6. Centralized Error Handler
app.use(errorHandler);

// 7. Server Initialization (Only listen if not imported as module)
if (process.env.NODE_ENV !== 'test') {
  connectDB().catch((err) => {
    console.error('Failed to initialize MongoDB at startup:', err.message);
  });

  const server = app.listen(env.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 RenewX API Server (MongoDB) running on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] Closed remaining connections. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
