-- =====================================================================
-- RenewX Crew - Complete Master Database Setup Script
-- Paste and Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 2. Profiles Table & Admin Trigger
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger to automatically create profile on signup and promote admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN LOWER(NEW.email) = 'dhushyandhneduncheziyan4896@gmail.com' THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = CASE 
      WHEN LOWER(EXCLUDED.email) = 'dhushyandhneduncheziyan4896@gmail.com' THEN 'admin'
      ELSE profiles.role 
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Upgrade any existing user with admin email
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) = 'dhushyandhneduncheziyan4896@gmail.com';

-- ---------------------------------------------------------------------
-- 3. Products Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL CHECK (category IN ('Laptops', 'Phones', 'Audio', 'Wearables', 'Cameras', 'Tablets')),
  original_price integer NOT NULL,
  price integer NOT NULL,
  condition text NOT NULL CHECK (condition IN ('Fair', 'Good', 'Excellent', 'Like New')),
  warranty_months integer NOT NULL DEFAULT 12,
  image_url text NOT NULL,
  rating real DEFAULT 4.8,
  reviews integer DEFAULT 0,
  stock integer NOT NULL DEFAULT 1,
  description text NOT NULL,
  specs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);

-- Open RLS for products so public can view and authenticated / service_role can manage
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products FOR DELETE
  USING (true);

-- ---------------------------------------------------------------------
-- 4. Seed Products
-- ---------------------------------------------------------------------
INSERT INTO public.products (name, brand, category, original_price, price, condition, warranty_months, image_url, rating, reviews, stock, description, specs)
VALUES
  (
    'iPhone 15 Pro Max 256GB - Natural Titanium',
    'Apple',
    'Phones',
    159900,
    119999,
    'Like New',
    18,
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    4.9,
    142,
    5,
    'Flawless condition with 100% battery health. Titanium frame with zero scratches, Super Retina XDR display with ProMotion.',
    '["256GB Storage", "A17 Pro 3nm Chip", "48MP Main Camera + 5x Telephoto", "USB-C Port", "100% Battery Health"]'::jsonb
  ),
  (
    'MacBook Pro 16" M3 Max 36GB / 1TB SSD',
    'Apple',
    'Laptops',
    349900,
    279999,
    'Like New',
    24,
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    5.0,
    88,
    3,
    'Certified pristine workstation. 14-core CPU, 30-core GPU, Liquid Retina XDR display. Includes original 140W MagSafe charger.',
    '["M3 Max (14-core CPU, 30-core GPU)", "36GB Unified Memory", "1TB Superfast SSD", "120Hz Liquid Retina XDR", "Cycle Count: 12"]'::jsonb
  ),
  (
    'Samsung Galaxy S24 Ultra 512GB - Titanium Gray',
    'Samsung',
    'Phones',
    139999,
    98999,
    'Excellent',
    12,
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
    4.8,
    96,
    8,
    'Stunning Galaxy AI powerhouse with built-in S-Pen. Clean flat titanium edges, 200MP camera system, 2600 nit AMOLED display.',
    '["Snapdragon 8 Gen 3", "512GB UFS 4.0 Storage", "200MP Quad Tele System", "S-Pen Included", "5000 mAh Battery"]'::jsonb
  ),
  (
    'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    'Sony',
    'Audio',
    34990,
    22499,
    'Like New',
    12,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    4.9,
    230,
    12,
    'Industry-leading dual processor active noise canceling. Plush synthetic leather earcups, 30-hour battery life with quick charge.',
    '["Integrated Processor V1 + QN1", "30-Hour Battery Life", "Speak-to-Chat & Multipoint", "Carry Case & Cable Included"]'::jsonb
  ),
  (
    'Apple Watch Ultra 2 49mm GPS + Cellular',
    'Apple',
    'Wearables',
    89900,
    64999,
    'Excellent',
    12,
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
    4.9,
    64,
    4,
    'Aerospace-grade titanium case with sapphire front crystal. Action button, 3000-nit display, precision dual-frequency GPS.',
    '["49mm Titanium Case", "3000-Nit Peak Brightness", "S9 SiP with Double Tap", "Depth Gauge & Water Temp", "Orange Ocean Band"]'::jsonb
  ),
  (
    'Sony Alpha A7 IV Full-Frame Mirrorless Camera (Body Only)',
    'Sony',
    'Cameras',
    242990,
    168999,
    'Like New',
    18,
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    4.9,
    41,
    2,
    '33MP full-frame Exmor R sensor with BIONZ XR engine. 4K 60p 10-bit recording, 759-point AF with real-time Eye tracking.',
    '["33MP Full-Frame Sensor", "4K 60p 10-bit 4:2:2", "5-axis In-body Stabilization", "Shutter Count < 2,400"]'::jsonb
  ),
  (
    'iPad Pro 12.9" M2 256GB Wi-Fi + 5G',
    'Apple',
    'Tablets',
    127900,
    89999,
    'Like New',
    12,
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
    4.8,
    72,
    6,
    'Mini-LED Liquid Retina XDR screen with 1600 nits peak HDR brightness. Apple Pencil hover support, Thunderbolt / USB 4 port.',
    '["Apple M2 Chip", "12.9\" Liquid Retina XDR (Mini-LED)", "256GB Storage", "5G Cellular + Wi-Fi 6E", "Face ID"]'::jsonb
  ),
  (
    'Dell XPS 15 9530 i7-13700H / 32GB / RTX 4060 / 3.5K OLED',
    'Dell',
    'Laptops',
    215000,
    144999,
    'Excellent',
    12,
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
    4.7,
    39,
    3,
    'Precision CNC machined aluminum chassis with carbon-fiber palm rest. Spectacular 3.5K touch OLED with 100% DCI-P3.',
    '["13th Gen Intel Core i7-13700H", "32GB DDR5 RAM", "NVIDIA RTX 4060 8GB", "15.6\" 3.5K OLED Touch", "1TB NVMe Gen4"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Orders & Order Items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subtotal integer NOT NULL,
  savings integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_policy" ON public.orders;
CREATE POLICY "orders_policy" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "order_items_policy" ON public.order_items;
CREATE POLICY "order_items_policy" ON public.order_items FOR ALL USING (true);

-- ---------------------------------------------------------------------
-- 6. Brands & Device Models
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'SMARTPHONES',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_all" ON public.brands;
CREATE POLICY "brands_all" ON public.brands FOR ALL USING (true);

DROP POLICY IF EXISTS "device_models_all" ON public.device_models;
CREATE POLICY "device_models_all" ON public.device_models FOR ALL USING (true);

DROP POLICY IF EXISTS "trade_in_all" ON public.trade_in_requests;
CREATE POLICY "trade_in_all" ON public.trade_in_requests FOR ALL USING (true);

-- Seed Initial Brands
INSERT INTO public.brands (id, name, logo_url, category, description)
VALUES
  ('brand-apple', 'Apple', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 'SMARTPHONES', 'Pioneering premium smartphones, laptops, tablets, and wearables.'),
  ('brand-samsung', 'Samsung', 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg', 'SMARTPHONES', 'Global innovator in AMOLED smartphones, foldable tech, and accessories.'),
  ('brand-google', 'Google Pixel', 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg', 'SMARTPHONES', 'Pure Android flagship experience with computational photography.'),
  ('brand-sony', 'Sony', 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg', 'AUDIO', 'Industry-leading audio engineering and Alpha full-frame cameras.'),
  ('brand-oneplus', 'OnePlus', 'https://upload.wikimedia.org/wikipedia/commons/f/f8/OP_LU_Reg_1_Line_RGB_RED_copy.svg', 'SMARTPHONES', 'Never Settle flagship performance with rapid charging technology.'),
  ('brand-dell', 'Dell', 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg', 'LAPTOPS', 'Enterprise and ultra-premium XPS workstation laptops.'),
  ('brand-lenovo', 'Lenovo', 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg', 'LAPTOPS', 'World-renowned ThinkPad durability and Legion gaming power.')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Device Models
INSERT INTO public.device_models (id, brand_id, brand_name, name, category, release_year, base_price, storage_options, is_featured)
VALUES
  ('model-iphone-15-pro-max', 'brand-apple', 'Apple', 'iPhone 15 Pro Max', 'smartphones', 2023, 119999.00, ARRAY['256GB', '512GB', '1TB'], true),
  ('model-iphone-15-pro', 'brand-apple', 'Apple', 'iPhone 15 Pro', 'smartphones', 2023, 99999.00, ARRAY['128GB', '256GB', '512GB', '1TB'], true),
  ('model-iphone-14-pro-max', 'brand-apple', 'Apple', 'iPhone 14 Pro Max', 'smartphones', 2022, 79999.00, ARRAY['128GB', '256GB', '512GB'], true),
  ('model-s24-ultra', 'brand-samsung', 'Samsung', 'Galaxy S24 Ultra', 'smartphones', 2024, 94999.00, ARRAY['256GB', '512GB', '1TB'], true),
  ('model-s23-ultra', 'brand-samsung', 'Samsung', 'Galaxy S23 Ultra', 'smartphones', 2023, 69999.00, ARRAY['256GB', '512GB'], true),
  ('model-pixel-8-pro', 'brand-google', 'Google Pixel', 'Pixel 8 Pro', 'smartphones', 2023, 64999.00, ARRAY['128GB', '256GB', '512GB'], true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Storage Bucket Setup (Public Images)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_select_images" ON storage.objects;
CREATE POLICY "public_select_images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public_insert_images" ON storage.objects;
CREATE POLICY "public_insert_images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public_update_images" ON storage.objects;
CREATE POLICY "public_update_images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');
