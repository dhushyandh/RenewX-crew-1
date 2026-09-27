import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isLoopback = (ip?: string): boolean => {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.')
  );
};

const shouldSkipInDev = (req: any): boolean => {
  // Always skip health checks from rate limiting
  if (req.path === '/health' || req.originalUrl?.includes('/health')) {
    return true;
  }
  // In development, skip loopback requests so hot-reloading & local tests are never blocked
  if (env.NODE_ENV !== 'production' && isLoopback(req.ip)) {
    return true;
  }
  return false;
};

/**
 * Standard rate limiter for general API routes.
 * Allows 1,000 requests per 15 minutes per IP in production.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 1000 : 50000,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: shouldSkipInDev,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again in a few minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Stricter rate limiter for sensitive authentication endpoints
 * (login, sign-up, send-otp, verify-otp, forgot-password).
 * Allows 30 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipInDev,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Rate limiter for checkout and order submissions.
 * Prevents automated order flooding and payment gateway abuse.
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipInDev,
  message: {
    success: false,
    error: {
      message: 'Too many checkout attempts. Please wait a few minutes before trying again.',
      code: 'CHECKOUT_RATE_LIMIT_EXCEEDED',
    },
  },
});
