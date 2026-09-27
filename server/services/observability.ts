import { Request } from 'express';
import { env } from '../config/env';

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

interface SentryParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseSentryDsn(dsn: string): SentryParsedDsn | null {
  try {
    const url = new URL(dsn.trim());
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];

    if (!publicKey || !host || !projectId) return null;
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

class ObservabilityService {
  private sentryConfig: SentryParsedDsn | null = null;
  private environment: string;

  constructor() {
    this.environment = env.NODE_ENV || 'development';
    const dsn = process.env.SENTRY_DSN?.trim();
    if (dsn) {
      this.sentryConfig = parseSentryDsn(dsn);
      if (this.sentryConfig) {
        console.log(`[Observability] Sentry error tracking active (project: ${this.sentryConfig.projectId})`);
      }
    }
  }

  /**
   * Dispatches an event payload directly to Sentry's Store API
   */
  private async dispatchToSentry(event: Record<string, any>): Promise<void> {
    if (!this.sentryConfig) return;

    try {
      const { publicKey, host, projectId } = this.sentryConfig;
      const endpoint = `https://${host}/api/${projectId}/store/`;
      const authHeader = `Sentry sentry_version=7, sentry_client=renewx-server/1.0.0, sentry_key=${publicKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': authHeader,
        },
        body: JSON.stringify({
          platform: 'node',
          environment: this.environment,
          timestamp: new Date().toISOString(),
          ...event,
        }),
      });

      if (!res.ok) {
        console.warn(`[Observability] Sentry ingest responded with HTTP ${res.status}`);
      }
    } catch (err) {
      // Never throw from observability dispatcher
      console.warn('[Observability] Failed to send event to Sentry:', err);
    }
  }

  /**
   * Formats structured logs for terminal or log aggregation (Render, CloudWatch, Datadog)
   */
  public log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const isProd = this.environment === 'production';

    if (isProd) {
      // Structured JSON output in production
      const logObject = {
        timestamp,
        level: level.toUpperCase(),
        environment: this.environment,
        message,
        ...meta,
      };
      if (level === 'error' || level === 'fatal') {
        console.error(JSON.stringify(logObject));
      } else if (level === 'warn') {
        console.warn(JSON.stringify(logObject));
      } else {
        console.log(JSON.stringify(logObject));
      }
    } else {
      // Human-readable colored prefix for local development
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      if (level === 'error' || level === 'fatal') {
        console.error(prefix, message, meta || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, meta || '');
      } else {
        console.log(prefix, message, meta || '');
      }
    }
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, error?: any, meta?: Record<string, any>): void {
    this.log('error', message, {
      error: error?.message || String(error || ''),
      stack: error?.stack,
      ...meta,
    });

    if (error && this.sentryConfig) {
      this.captureException(error, meta);
    }
  }

  /**
   * Captures an unhandled Exception and sends it to Sentry
   */
  public async captureException(
    error: any,
    context?: { req?: Request; [key: string]: any }
  ): Promise<void> {
    const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));
    const req = context?.req;

    const event: Record<string, any> = {
      level: 'error',
      exception: {
        values: [
          {
            type: errObj.name || 'Error',
            value: errObj.message,
            stacktrace: {
              frames: (errObj.stack || '').split('\n').map((line) => ({ filename: line.trim() })),
            },
          },
        ],
      },
      tags: {
        environment: this.environment,
      },
      extra: { ...context },
    };

    if (req) {
      event.request = {
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        method: req.method,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      };
      if ((req as any).user) {
        event.user = {
          id: (req as any).user.id,
          email: (req as any).user.email,
          role: (req as any).user.role,
        };
      }
    }

    await this.dispatchToSentry(event);
  }

  /**
   * Tracks high-impact business payment failures (Razorpay, webhook errors, COD rejections)
   */
  public trackPaymentFailure(payload: {
    orderId: string;
    subtotal?: number;
    paymentMethod: string;
    reason: string;
    userId?: string;
    details?: any;
  }): void {
    this.log('warn', `💳 [Payment Failure] Order #${payload.orderId}: ${payload.reason}`, payload);

    if (this.sentryConfig) {
      this.dispatchToSentry({
        level: 'warning',
        message: `Payment Failure: Order #${payload.orderId} (${payload.paymentMethod})`,
        tags: {
          category: 'payment_failure',
          paymentMethod: payload.paymentMethod,
        },
        extra: payload,
      });
    }
  }

  /**
   * Initializes global process failure monitors (uncaughtException, unhandledRejection)
   */
  public setupProcessErrorHandling(): void {
    process.on('uncaughtException', (err) => {
      this.log('fatal', '💥 [FATAL] Uncaught Exception:', {
        message: err.message,
        stack: err.stack,
      });
      this.captureException(err).finally(() => {
        if (this.environment === 'production') {
          process.exit(1);
        }
      });
    });

    process.on('unhandledRejection', (reason) => {
      this.log('error', '⚠️ [UNHANDLED REJECTION] Promise rejection occurred:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      if (reason instanceof Error) {
        this.captureException(reason);
      }
    });
  }
}

export const observability = new ObservabilityService();
