import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

export type BreadcrumbType = 'navigation' | 'http' | 'user_action' | 'system';

interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  data?: Record<string, any>;
}

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

class ClientObservabilityService {
  private sentryConfig: SentryParsedDsn | null = null;
  private sentrySdkActive = false;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 25;
  private userContext: { id?: string; email?: string } | null = null;
  private initialized = false;

  constructor() {
    const dsn =
      typeof process !== 'undefined'
        ? process.env?.EXPO_PUBLIC_SENTRY_DSN?.trim()
        : undefined;

    if (dsn) {
      this.sentryConfig = parseSentryDsn(dsn);
    }
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const dsn =
      typeof process !== 'undefined'
        ? process.env?.EXPO_PUBLIC_SENTRY_DSN?.trim()
        : undefined;

    // 1. Initialize official @sentry/react-native SDK if DSN is set
    if (dsn) {
      try {
        Sentry.init({
          dsn,
          debug: __DEV__,
          tracesSampleRate: 1.0,
        });
        this.sentrySdkActive = true;
      } catch (sdkErr) {
        console.warn('[Observability] Sentry.init failed, using fallback HTTP dispatcher:', sdkErr);
      }
    }

    // 2. Add breadcrumb on session start
    this.addBreadcrumb('system', 'App session initialized', {
      platform: Platform.OS,
      version: Platform.Version,
    });

    // 3. Web unhandled promise rejection listener
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Promise'));
        this.captureException(error, { source: 'unhandledrejection' });
      });

      window.addEventListener('error', (event) => {
        if (event.error) {
          this.captureException(event.error, { source: 'window.onerror' });
        }
      });
    }

    // 4. React Native global error tracking fallback
    if (Platform.OS !== 'web' && !this.sentrySdkActive) {
      const globalHandler = (ErrorUtils as any)?.getGlobalHandler?.();
      if ((ErrorUtils as any)?.setGlobalHandler) {
        (ErrorUtils as any).setGlobalHandler((error: any, isFatal?: boolean) => {
          this.captureException(error, { isFatal, source: 'ErrorUtils' });
          if (typeof globalHandler === 'function') {
            globalHandler(error, isFatal);
          }
        });
      }
    }
  }

  public setUser(user: { id?: string; email?: string } | null): void {
    this.userContext = user;
    if (user?.id) {
      this.addBreadcrumb('user_action', 'User authenticated', { id: user.id });
    }
    if (this.sentrySdkActive) {
      try {
        Sentry.setUser(user ? { id: user.id, email: user.email } : null);
      } catch {
        // Safe ignore
      }
    }
  }

  public addBreadcrumb(
    categoryOrCrumb: string | { category: string; message: string; data?: Record<string, any> },
    message?: string,
    data?: Record<string, any>
  ): void {
    let category = 'app';
    let msg = '';
    let customData = data;

    if (typeof categoryOrCrumb === 'object' && categoryOrCrumb !== null) {
      category = categoryOrCrumb.category || 'app';
      msg = categoryOrCrumb.message || '';
      customData = categoryOrCrumb.data || data;
    } else {
      category = String(categoryOrCrumb || 'app');
      msg = String(message || '');
    }

    const crumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message: msg,
      data: customData,
    };
    this.breadcrumbs.push(crumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.sentrySdkActive) {
      try {
        Sentry.addBreadcrumb({
          category,
          message,
          data,
          level: 'info',
        });
      } catch {
        // Safe ignore
      }
    }
  }

  private async dispatchToSentryHttp(event: Record<string, any>): Promise<void> {
    if (!this.sentryConfig) return;

    try {
      const { publicKey, host, projectId } = this.sentryConfig;
      const endpoint = `https://${host}/api/${projectId}/store/`;
      const authHeader = `Sentry sentry_version=7, sentry_client=renewx-mobile/1.0.0, sentry_key=${publicKey}`;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': authHeader,
        },
        body: JSON.stringify({
          platform: 'javascript',
          environment: __DEV__ ? 'development' : 'production',
          timestamp: new Date().toISOString(),
          breadcrumbs: {
            values: this.breadcrumbs,
          },
          user: this.userContext || undefined,
          tags: {
            os: Platform.OS,
          },
          ...event,
        }),
      });
    } catch {
      // Never throw from telemetry
    }
  }

  public captureException(error: any, context?: Record<string, any>): void {
    const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));

    if (__DEV__) {
      console.warn('[Observability] Exception captured:', errObj.message, context || '');
    }

    this.addBreadcrumb('exception', errObj.message, { stack: errObj.stack });

    if (this.sentrySdkActive) {
      try {
        Sentry.captureException(errObj, { extra: context });
        return;
      } catch {
        // Fallback to HTTP
      }
    }

    this.dispatchToSentryHttp({
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
      extra: context,
    });
  }

  /**
   * Tracks customer payment & checkout drop-offs proactively
   */
  public trackPaymentFailure(payload: {
    orderId?: string;
    amount?: number;
    paymentMethod: string;
    reason: string;
    stage?: 'checkout' | 'gateway_open' | 'verification';
  }): void {
    this.addBreadcrumb('payment', `Payment Failed: ${payload.reason}`, payload);

    if (__DEV__) {
      console.warn('💳 [Client Observability] Payment failed:', payload);
    }

    if (this.sentrySdkActive) {
      try {
        Sentry.captureMessage(`Checkout Drop: ${payload.reason} (${payload.paymentMethod})`, {
          level: 'warning',
          extra: payload,
          tags: {
            category: 'checkout_failure',
            paymentMethod: payload.paymentMethod,
            stage: payload.stage || 'unknown',
          },
        });
        return;
      } catch {
        // Fallback to HTTP
      }
    }

    this.dispatchToSentryHttp({
      level: 'warning',
      message: `Checkout Drop: ${payload.reason} (${payload.paymentMethod})`,
      tags: {
        category: 'checkout_failure',
        paymentMethod: payload.paymentMethod,
        stage: payload.stage || 'unknown',
      },
      extra: payload,
    });
  }
}

export const clientObservability = new ClientObservabilityService();
