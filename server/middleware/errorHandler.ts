import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { observability } from '../services/observability';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal Server Error');

  if (statusCode >= 500) {
    observability.error(`[API Error] ${req.method} ${req.originalUrl} (${statusCode})`, err, {
      req,
      statusCode,
      code: err.code,
    });
  } else {
    observability.warn(`[API Client Error] ${req.method} ${req.originalUrl} (${statusCode}) - ${err.message}`, {
      code: err.code,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.details || err.stack : undefined,
    },
  });
}
