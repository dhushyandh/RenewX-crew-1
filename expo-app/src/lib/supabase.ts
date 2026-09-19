import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qbozhivwwwgaolcsihan.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib3poaXZ3d3dnYW9sY3NpaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTgxNzIsImV4cCI6MjEwNTM3NDE3Mn0._PeURRGfoJeewT0aUcQAKkauYHKDfl6AA4P_Vuojj3g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
