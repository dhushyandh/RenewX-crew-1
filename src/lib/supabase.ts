// MongoDB-backed Data Client Adapter
// Translates query operations to Express MongoDB REST endpoints

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000/api';
const TOKEN_KEY = 'renewx_auth_token';
const USER_KEY = 'renewx_auth_user';

export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  original_price: number;
  price: number;
  condition: string;
  warranty_months: number;
  image_url: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
  specs: string[];
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
};

export type OrderRow = {
  id: string;
  user_id: string;
  subtotal: number;
  savings: number;
  status: string;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
};

class MongoQueryBuilder {
  private table: string;
  private endpoint: string;
  private queryParams: Record<string, string> = {};
  private targetId: string | null = null;
  private singleResult = false;

  constructor(table: string) {
    this.table = table;
    if (table === 'products') this.endpoint = '/products';
    else if (table === 'orders') this.endpoint = '/orders';
    else if (table === 'profiles') this.endpoint = '/users';
    else if (table === 'brands') this.endpoint = '/brands';
    else if (table === 'device_models') this.endpoint = '/models';
    else if (table === 'trade_in_requests') this.endpoint = '/trade-in/pickup';
    else this.endpoint = `/${table}`;
  }

  private getToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(TOKEN_KEY);
      }
    } catch {
      // Ignore
    }
    return null;
  }

  select(_columns = '*') {
    return this;
  }

  eq(field: string, value: any) {
    if (field === 'id' || field === '_id') {
      this.targetId = String(value);
    } else {
      this.queryParams[field] = String(value);
    }
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    if (field === 'price') {
      this.queryParams.sort = opts?.ascending ? 'price_asc' : 'price_desc';
    }
    return this;
  }

  limit(count: number) {
    this.queryParams.limit = String(count);
    return this;
  }

  single() {
    this.singleResult = true;
    return this.execute();
  }

  maybeSingle() {
    this.singleResult = true;
    return this.execute();
  }

  async insert(values: any | any[]) {
    const payload = Array.isArray(values) ? values[0] : values;
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}${this.endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: json.error || { message: `HTTP ${res.status}` } };
      }
      return { data: json.data || payload, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async update(updates: any) {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = this.targetId
      ? `${API_BASE_URL}${this.endpoint}/${this.targetId}`
      : `${API_BASE_URL}${this.endpoint}`;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: json.error || { message: `HTTP ${res.status}` } };
      }
      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async delete() {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = this.targetId
      ? `${API_BASE_URL}${this.endpoint}/${this.targetId}`
      : `${API_BASE_URL}${this.endpoint}`;

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: json.error || { message: `HTTP ${res.status}` } };
      }
      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `${API_BASE_URL}${this.endpoint}`;
    if (this.targetId) {
      url += `/${this.targetId}`;
    } else {
      const q = new URLSearchParams(this.queryParams).toString();
      if (q) url += `?${q}`;
    }

    try {
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: json.error || { message: `HTTP ${res.status}` } };
      }

      let resultData = json.data !== undefined ? json.data : json;
      if (this.singleResult && Array.isArray(resultData)) {
        resultData = resultData[0] || null;
      }
      return { data: resultData, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

export const supabase = {
  from(table: string) {
    return new MongoQueryBuilder(table);
  },

  async rpc(fnName: string, args: any) {
    if (fnName === 'set_user_role') {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      const res = await fetch(`${API_BASE_URL}/users/${args.p_user_id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: args.p_role }),
      });
      const json = await res.json();
      return { data: json.data, error: res.ok ? null : json.error };
    }
    return { data: null, error: { message: `RPC ${fnName} not implemented` } };
  },

  auth: {
    async getSession() {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      if (!token) return { data: { session: null }, error: null };
      const user = userStr ? JSON.parse(userStr) : null;
      return {
        data: {
          session: {
            access_token: token,
            user,
          },
        },
        error: null,
      };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { data: { user: null, session: null }, error: { message: json.error?.message || 'Login failed' } };
        }
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        return {
          data: {
            user: json.data.user,
            session: { access_token: json.data.token, user: json.data.user },
          },
          error: null,
        };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message } };
      }
    },

    async signUp({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { data: { user: null, session: null }, error: { message: json.error?.message || 'Sign up failed' } };
        }
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        return {
          data: {
            user: json.data.user,
            session: { access_token: json.data.token, user: json.data.user },
          },
          error: null,
        };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message } };
      }
    },

    async signOut() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      // Return unsubscription token
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },
};
