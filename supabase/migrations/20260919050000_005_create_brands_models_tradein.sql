-- 005_create_brands_models_tradein.sql
-- Migration: Create tables for Brands, Device Models, and Trade-In Requests with RLS

-- 1. Create Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'SMARTPHONES',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Device Models Table
CREATE TABLE IF NOT EXISTS public.device_models (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'smartphones',
  release_year INTEGER NOT NULL DEFAULT 2024,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 50000.00,
  storage_options TEXT[] NOT NULL DEFAULT ARRAY['128GB', '256GB', '512GB'],
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Trade-In Requests Table
CREATE TABLE IF NOT EXISTS public.trade_in_requests (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  screen_condition TEXT NOT NULL,
  body_condition TEXT NOT NULL,
  functional_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  accessories TEXT[] NOT NULL DEFAULT '{}'::text[],
  valuation_amount NUMERIC(10, 2) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pincode TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Brands (Everyone can read, admins can modify)
CREATE POLICY "Public can view brands"
  ON public.brands FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage brands"
  ON public.brands FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6. Policies for Device Models (Everyone can read, admins can modify)
CREATE POLICY "Public can view device models"
  ON public.device_models FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage device models"
  ON public.device_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 7. Policies for Trade-In Requests
CREATE POLICY "Users can create trade-in requests"
  ON public.trade_in_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own trade-in requests"
  ON public.trade_in_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage trade-in requests"
  ON public.trade_in_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_device_models_brand_id ON public.device_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_device_models_category ON public.device_models(category);
CREATE INDEX IF NOT EXISTS idx_trade_in_requests_created_at ON public.trade_in_requests(created_at DESC);
