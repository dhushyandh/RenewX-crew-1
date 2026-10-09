import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const PRODUCTION_API_BASE_URL = 'https://renewx-crew-server.onrender.com/api';

export function getApiBaseUrl(): string {
  // If running in a web browser
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname);

    // If deployed on public web (e.g. *.expo.app, vercel, netlify, custom domain) or accessed over HTTPS,
    // NEVER use http:// or local IP - browsers strictly block Mixed Content.
    if (!isLocalHost || protocol === 'https:') {
      const configured =
        typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL?.trim() : undefined;
      // Allow configured URL only if it's HTTPS and not pointing to a private LAN/localhost
      if (
        configured &&
        configured.startsWith('https://') &&
        !configured.includes('localhost') &&
        !configured.includes('127.0.0.1') &&
        !/192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/.test(configured)
      ) {
        return configured;
      }
      return PRODUCTION_API_BASE_URL;
    }

    // Local web development on HTTP (e.g. http://localhost:8081 or http://192.168.1.4:8081)
    return `http://${hostname}:5000/api`;
  }

  const configured =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL?.trim() : undefined;
  let url = configured || PRODUCTION_API_BASE_URL;

  // On native mobile (Android / iOS physical device or emulator), resolve local host to the machine running Metro bundler & backend server.
  if (Platform.OS !== 'web') {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        if (url.includes('localhost') || url.includes('127.0.0.1') || /192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/.test(url)) {
          return url.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/, match[1]);
        }
      }
    }
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      return url.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
  }

  return url;
}

const TOKEN_STORAGE_KEY = '@renewx_auth_token';

type ConnectionListener = (isOffline: boolean) => void;
const connectionListeners = new Set<ConnectionListener>();

export function onConnectionChange(listener: ConnectionListener) {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

export function notifyConnectionState(isOffline: boolean) {
  connectionListeners.forEach((listener) => {
    try {
      listener(isOffline);
    } catch {}
  });
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = options.retries ?? (method === 'GET' ? 2 : 0);

  let attempt = 0;
  while (true) {
    attempt++;
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const timeoutMs = options.timeoutMs ?? 35000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      // Successful response received from backend
      notifyConnectionState(false);
    } catch (fetchError: any) {
      notifyConnectionState(true);
      if (attempt <= maxRetries) {
        await sleep(Math.min(500 * Math.pow(2, attempt - 1), 2000));
        continue;
      }
      const error = new Error(
        fetchError?.name === 'AbortError'
          ? 'Request timed out. Please check your connection.'
          : 'Unable to connect to RenewX. Please check your connection.',
      ) as Error & { code?: string; status?: number; network?: boolean };
      error.code = fetchError?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR';
      error.network = true;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Transient server errors (502, 503, 504) retry for idempotent GET requests
    if (res.status >= 502 && res.status <= 504 && attempt <= maxRetries) {
      await sleep(Math.min(500 * Math.pow(2, attempt - 1), 2000));
      continue;
    }

    const contentType = res.headers.get('content-type') || '';
    const json = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok || json?.success === false) {
      // If token expired / invalid on authenticated requests, prune stale session
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/verify-otp')) {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      const errorMsg = json?.error?.message || `HTTP Error ${res.status}`;
      const error = new Error(errorMsg) as Error & { code?: string; status?: number };
      error.code = json?.error?.code;
      error.status = res.status;
      throw error;
    }

    return json.data !== undefined ? json.data : json;
  }
}

export const api = {
  health: async () => {
    try {
      return await request<any>('/health', { timeoutMs: 8000 });
    } catch {
      return { status: 'offline', localFallback: true };
    }
  },

  auth: {
    requestPasswordReset: async (email: string, redirectUrl?: string) =>
      request<{ email: string; expiresInMinutes: number; resetUrl?: string; token?: string; simulated?: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, redirectUrl }),
        timeoutMs: 45000,
      }),

    verifyResetToken: async (token: string, email?: string) =>
      request<{ email: string; name?: string }>('/auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      }),

    resetPassword: async (payload: { token: string; newPassword: string; email?: string }) =>
      request<{ token: string; user: any }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    sendAuthOtp: async (email: string, intent?: 'sign_in' | 'sign_up', password?: string, fullName?: string) =>
      request<{ email: string; expiresInMinutes?: number }>('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, intent, password, full_name: fullName }),
      }),

    verifyAuthOtp: async (email: string, code: string) =>
      request<{ token: string; user: any }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }),
  },

  brands: {
    getAll: async (params?: { category?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return await request<any[]>(`/brands${q ? `?${q}` : ''}`);
    },
    getById: async (id: string) => request<any>(`/brands/${id}`),
    create: async (payload: any) => request<any>('/brands', { method: 'POST', body: JSON.stringify(payload) }),
    update: async (id: string, payload: any) => request<any>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: async (id: string) => request<any>(`/brands/${id}`, { method: 'DELETE' }),
  },

  models: {
    getAll: async (params?: { brand_id?: string; category?: string; featured?: boolean; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return await request<any[]>(`/models${q ? `?${q}` : ''}`);
    },
    getById: async (id: string) => request<any>(`/models/${id}`),
    create: async (payload: any) => request<any>('/models', { method: 'POST', body: JSON.stringify(payload) }),
    update: async (id: string, payload: any) => request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: async (id: string) => request<any>(`/models/${id}`, { method: 'DELETE' }),
  },

  products: {
    getAll: async (params?: {
      category?: string; brand?: string; condition?: string; search?: string; sort?: string; page?: number; limit?: number;
    }) => {
      const queryParams = Object.entries(params || {}).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {});
      const q = new URLSearchParams(queryParams).toString();
      return await request<any[]>(`/products${q ? `?${q}` : ''}`);
    },
    getById: async (id: string) => request<any>(`/products/${encodeURIComponent(id)}`),
    create: async (payload: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(payload) }),
    update: async (id: string, payload: any) => request<any>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: async (id: string) => request<any>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getLowStockAlerts: async (threshold = 3) => request<any[]>(`/products/alerts/low-stock?threshold=${threshold}`),
  },

  orders: {
    getAll: async (params?: Record<string, string>) => {
      const q = new URLSearchParams(params || {}).toString();
      return await request<any[]>(`/orders${q ? `?${q}` : ''}`);
    },

    createCheckout: async (
      payload: {
        items: { product_id: string; quantity: number }[];
        customer_info: { name: string; phone: string; address: string; pincode: string };
        payment_method?: 'razorpay' | 'cod';
      },
      idempotencyKey: string,
    ) => {
      return await request<{
        order: any;
        razorpay_key_id?: string;
        razorpay_order_id?: string;
        amount?: number;
        currency?: 'INR';
        is_cod?: boolean;
      }>('/orders/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      });
    },

    verifyPayment: async (payload: {
      order_id: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      return await request<any>('/orders/verify-payment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getById: async (id: string) => request<any>(`/orders/${encodeURIComponent(id)}`),

    updateStatus: async (
      id: string,
      status: string,
      courier?: string,
      tracking_number?: string,
      courier_phone?: string,
      estimated_delivery?: string,
    ) => {
      return await request<any>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, courier, tracking_number, courier_phone, estimated_delivery }),
      });
    },

    delete: async (id: string) => {
      return await request<any>(`/orders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },

    track: async (id: string) => request<any>(`/orders/track/${encodeURIComponent(id)}`),
  },

  users: {
    updateProfile: async (data: {
      full_name?: string;
      avatar_url?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      bio?: string;
      saved_addresses?: any[];
    }) =>
      request<any>('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    getAddresses: async () => request<any>('/users/me/addresses'),
    addAddress: async (data: any) =>
      request<any>('/users/me/addresses', { method: 'POST', body: JSON.stringify(data) }),
    updateAddress: async (id: string, data: any) =>
      request<any>(`/users/me/addresses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAddress: async (id: string) =>
      request<any>(`/users/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    requestEmailVerification: async (new_email: string) =>
      request<{ pending_email: string; expires_at: string }>('/users/me/email/request-verification', {
        method: 'POST',
        body: JSON.stringify({ new_email }),
      }),
    verifyEmailUpdate: async (code: string) =>
      request<any>('/users/me/email/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    getNotificationPreferences: async () => request<any>('/users/me/notification-preferences'),
    registerPushToken: async (token: string) =>
      request<any>('/users/me/push-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    unregisterPushToken: async (token: string) =>
      request<any>('/users/me/push-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      }),
    updateNotificationPreferences: async (payload: { order_updates?: boolean; sell_request_updates?: boolean; marketing?: boolean }) =>
      request<any>('/users/me/notification-preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
    getAll: async () => request<any[]>('/users'),
    updateRole: async (id: string, role?: 'admin' | 'customer' | string, status?: 'active' | 'inactive' | 'blocked' | string) =>
      request<any>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role, status }) }),
    delete: async (id: string) =>
      request<any>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  tradeIn: {
    getQuote: async (payload: any) => request<any>('/trade-in/quote', { method: 'POST', body: JSON.stringify(payload) }),
    createPickup: async (payload: any) => request<any>('/trade-in/pickup', { method: 'POST', body: JSON.stringify(payload) }),
    getMyRequests: async () => request<any[]>('/trade-in/my-requests'),
    getAll: async (status?: string) => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return request<any[]>(`/trade-in/pickup${q}`);
    },
    updateStatus: async (id: string, status: string, approvedAmount?: number, adminNote?: string) =>
      request<any>(`/trade-in/pickup/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, approvedAmount, adminNote }),
      }),
    cancel: async (id: string, reason?: string) =>
      request<any>(`/trade-in/pickup/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    track: async (id: string) => request<any>(`/trade-in/track/${encodeURIComponent(id)}`),
  },

  tracking: {
    universalLookup: async (query: string) => request<any>(`/tracking/universal/${encodeURIComponent(query)}`),
    trackOrder: async (id: string) => request<any>(`/tracking/order/${encodeURIComponent(id)}`),
    trackSell: async (id: string) => request<any>(`/tracking/sell/${encodeURIComponent(id)}`),
  },

  notifications: {
    getAll: async () => request<any>('/notifications'),
    markRead: async (id: string) => request<any>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    markAllRead: async () => request<any>('/notifications/read-all', { method: 'PATCH' }),
    delete: async (id: string) => request<any>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    clearAll: async () => request<any>('/notifications/clear-all', { method: 'DELETE' }),
    triggerTest: async (action?: string) =>
      request<any>('/notifications/test-event', {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    sendPromotion: async (payload: {
      title: string;
      body: string;
      product1Id: string;
      product2Id: string;
    }) =>
      request<any>('/notifications/admin/promotion', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getWebPushPublicKey: async () => request<{ publicKey: string }>('/notifications/web-push/public-key'),
    subscribeWebPush: async (subscription: any) =>
      request<any>('/notifications/web-push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
      }),
    unsubscribeWebPush: async (endpoint?: string) =>
      request<any>('/notifications/web-push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      }),
  },

  upload: {
    image: async (fileData: { uri: string; name?: string; type?: string }) => {
      const formData = new FormData();
      const filename = fileData.name || fileData.uri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = fileData.type || (match ? `image/${match[1]}` : 'image/jpeg');

      if (Platform.OS === 'web' && fileData.uri) {
        try {
          if (fileData.uri.startsWith('blob:') || fileData.uri.startsWith('data:')) {
            const blob = await fetch(fileData.uri).then((r) => r.blob());
            formData.append('file', blob, filename);
          } else {
            formData.append('file', { uri: fileData.uri, name: filename, type } as any);
          }
        } catch {
          formData.append('file', { uri: fileData.uri, name: filename, type } as any);
        }
      } else {
        formData.append('file', { uri: fileData.uri, name: filename, type } as any);
      }

      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(`${getApiBaseUrl()}/upload`, { method: 'POST', body: formData, headers });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          const error = new Error(json?.error?.message || `Upload failed (HTTP ${res.status})`) as Error & { status?: number };
          error.status = res.status;
          throw error;
        }
        return json.data;
      } catch (err) {
        // Never return a device-local URI as a fake successful upload.
        // Local URIs are not durable on another device/server.
        throw err;
      }
    },

    base64: async (base64String: string, fileName = 'upload.jpg', contentType = 'image/jpeg') =>
      request<{ url: string; fileName: string }>('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({ base64: base64String, fileName, contentType }),
      }),

    url: async (imageUrl: string) =>
      request<{ url: string; fileName?: string }>('/upload/url', {
        method: 'POST',
        body: JSON.stringify({ url: imageUrl }),
      }),
  },

  analytics: {
    getRealtime: async (period: 'today' | 'week' | 'month' | 'year' | 'all' = 'month') =>
      request<{
        timestamp: string;
        period: string;
        kpis: {
          totalRevenue: number;
          allTimeRevenue: number;
          totalOrders: number;
          allTimeOrders: number;
          totalCustomers: number;
          avgOrderValue: number;
          today: { revenue: number; orders: number };
          thisWeek: { revenue: number; orders: number };
          thisMonth: { revenue: number; orders: number };
        };
        orderStatuses: Record<string, number>;
        paymentStatuses: Record<string, number>;
        categoryBreakdown: {
          category: string;
          count: number;
          stock: number;
          inventoryValue: number;
          sales: number;
          percentage: number;
        }[];
        inventoryHealth: {
          totalProducts: number;
          inStock: number;
          lowStock: number;
          outOfStock: number;
          totalInventoryValue: number;
        };
        tradeInStats: {
          totalRequests: number;
          pending: number;
          inspected: number;
          totalPayouts: number;
        };
        salesTrend: { date: string; label: string; revenue: number; orders: number }[];
        recentTransactions: {
          id: string;
          customerName: string;
          customerPhone: string;
          amount: number;
          status: string;
          paymentStatus: string;
          paymentMethod: string;
          itemsCount: number;
          createdAt: string;
        }[];
      }>(`/analytics?period=${period}`),
  },
};

