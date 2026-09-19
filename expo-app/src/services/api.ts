import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const PRODUCTION_API_BASE_URL = 'https://renewx-crew-server.onrender.com/api';
const DEFAULT_HOST = PRODUCTION_API_BASE_URL;
const configuredApiUrl =
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL?.trim() : undefined;
const API_BASE_URL = configuredApiUrl || DEFAULT_HOST;

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
const TOKEN_STORAGE_KEY = '@renewx_auth_token';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (fetchError: any) {
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

  const contentType = res.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok || json.success === false) {
    const errorMsg = json.error?.message || `HTTP Error ${res.status}`;
    const error = new Error(errorMsg) as Error & { code?: string; status?: number };
    error.code = json.error?.code;
    error.status = res.status;
    throw error;
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  health: async () => {
    try {
      return await request<any>('/health');
    } catch {
      return { status: 'offline', localFallback: true };
    }
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

    updateStatus: async (id: string, status: string, courier?: string, tracking_number?: string) => {
      return await request<any>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, courier, tracking_number }),
      });
    },
  },

  users: {
    getNotificationPreferences: async () => request<any>('/users/me/notification-preferences'),
    updateNotificationPreferences: async (payload: { order_updates?: boolean; sell_request_updates?: boolean; marketing?: boolean }) =>
      request<any>('/users/me/notification-preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
    getAll: async () => request<any[]>('/users'),
    updateRole: async (id: string, role: 'admin' | 'customer') =>
      request<any>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
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
  },

  notifications: {
    getAll: async () => request<any>('/notifications'),
    markRead: async (id: string) => request<any>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    markAllRead: async () => request<any>('/notifications/read-all', { method: 'PATCH' }),
  },

  upload: {
    image: async (fileData: { uri: string; name?: string; type?: string }) => {
      const formData = new FormData();
      const filename = fileData.name || fileData.uri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = fileData.type || (match ? `image/${match[1]}` : 'image/jpeg');

      formData.append('file', { uri: fileData.uri, name: filename, type } as any);

      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData, headers });
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
  },
};
