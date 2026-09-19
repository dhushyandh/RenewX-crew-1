import { initialBrands, initialModels } from '@/data/brandsData';
import { products as fallbackProducts } from '@/data/products';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'renewx_auth_token';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    const errorMsg = json.error?.message || `HTTP Error ${res.status}`;
    throw new Error(errorMsg);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // System Health
  health: async () => {
    try {
      return await request<any>('/health');
    } catch {
      return { status: 'offline', localFallback: true };
    }
  },

  // Brands API
  brands: {
    getAll: async (params?: { category?: string; search?: string }) => {
      try {
        const q = new URLSearchParams(params as any).toString();
        return await request<any[]>(`/brands${q ? `?${q}` : ''}`);
      } catch (e) {
        console.warn('[API Client] Falling back to initial brands cache:', e);
        return initialBrands;
      }
    },
    getById: async (id: string) => {
      try {
        return await request<any>(`/brands/${id}`);
      } catch {
        return initialBrands.find((b) => b.id === id);
      }
    },
    create: async (payload: any) => {
      return await request<any>('/brands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: async (id: string, payload: any) => {
      return await request<any>(`/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: string) => {
      return await request<any>(`/brands/${id}`, { method: 'DELETE' });
    },
  },

  // Device Models API
  models: {
    getAll: async (params?: { brand_id?: string; category?: string; featured?: boolean; search?: string }) => {
      try {
        const q = new URLSearchParams(params as any).toString();
        return await request<any[]>(`/models${q ? `?${q}` : ''}`);
      } catch (e) {
        console.warn('[API Client] Falling back to initial models cache:', e);
        if (params?.brand_id && params.brand_id !== 'all') {
          return initialModels.filter((m) => m.brand_id === params.brand_id);
        }
        return initialModels;
      }
    },
    getById: async (id: string) => {
      try {
        return await request<any>(`/models/${id}`);
      } catch {
        return initialModels.find((m) => m.id === id);
      }
    },
    create: async (payload: any) => {
      return await request<any>('/models', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: async (id: string, payload: any) => {
      return await request<any>(`/models/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: string) => {
      return await request<any>(`/models/${id}`, { method: 'DELETE' });
    },
  },

  // Products API
  products: {
    getAll: async (params?: { category?: string; brand?: string; condition?: string; search?: string; sort?: string }) => {
      try {
        const q = new URLSearchParams(params as any).toString();
        return await request<any[]>(`/products${q ? `?${q}` : ''}`);
      } catch (e) {
        console.warn('[API Client] Falling back to initial products:', e);
        return fallbackProducts as any[];
      }
    },
    getById: async (id: string) => {
      try {
        return await request<any>(`/products/${id}`);
      } catch {
        return fallbackProducts.find((p) => p.id === id);
      }
    },
    create: async (payload: any) => {
      return await request<any>('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: async (id: string, payload: any) => {
      return await request<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: string) => {
      return await request<any>(`/products/${id}`, { method: 'DELETE' });
    },
    getLowStockAlerts: async (threshold = 3) => {
      return await request<any[]>(`/products/alerts/low-stock?threshold=${threshold}`);
    },
  },

  // Orders API
  orders: {
    getAll: async (params?: Record<string, string>) => {
      const q = new URLSearchParams(params).toString();
      return await request<any[]>(`/orders${q ? `?${q}` : ''}`);
    },
    create: async (payload: any) => {
      return await request<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateStatus: async (id: string, status: string, courier?: string, tracking_number?: string) => {
      return await request<any>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, courier, tracking_number }),
      });
    },
  },

  // Users & Roles API
  users: {
    getAll: async () => {
      return await request<any[]>('/users');
    },
    updateRole: async (id: string, role: 'admin' | 'customer') => {
      return await request<any>(`/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
  },

  // Trade-In API
  tradeIn: {
    getQuote: async (payload: any) => {
      return await request<any>('/trade-in/quote', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    createPickup: async (payload: any) => {
      return await request<any>('/trade-in/pickup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  // Image Upload API (Web)
  upload: {
    file: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'File upload failed');
      }
      return json.data;
    },

    base64: async (base64String: string, fileName = 'upload.jpg', contentType = 'image/jpeg') => {
      const result = await request<{ url: string; fileName: string }>('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({
          base64: base64String,
          fileName,
          contentType,
        }),
      });
      return result;
    },
  },
};
