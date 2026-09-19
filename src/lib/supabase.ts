import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

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
  created_at: string;
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
