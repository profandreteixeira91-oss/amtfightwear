
-- ============================================
-- FASE 1: Loja Virtual AMT - Schema
-- ============================================

-- 1. store_categories
CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;
GRANT ALL ON public.store_categories TO service_role;

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active categories" ON public.store_categories
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Auth full access categories" ON public.store_categories
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER store_categories_updated_at
  BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_store_categories_parent ON public.store_categories(parent_id);
CREATE INDEX idx_store_categories_slug ON public.store_categories(slug);

-- 2. Extensões na tabela products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS description_html TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_featured ON public.products(status, featured);

-- Allow anon to read active products (public storefront)
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT TO anon USING (status = 'active');
GRANT SELECT ON public.products TO anon;

-- 3. store_product_images
CREATE TABLE IF NOT EXISTS public.store_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_images TO authenticated;
GRANT ALL ON public.store_product_images TO service_role;

ALTER TABLE public.store_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product images" ON public.store_product_images
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active')
  );
CREATE POLICY "Auth full access product images" ON public.store_product_images
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_store_product_images_product ON public.store_product_images(product_id, sort_order);

-- 4. store_product_variants
CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  size TEXT,
  color TEXT,
  option_label TEXT,
  price NUMERIC(12,2),
  compare_at_price NUMERIC(12,2),
  stock INTEGER NOT NULL DEFAULT 0,
  weight_grams INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_variants TO authenticated;
GRANT ALL ON public.store_product_variants TO service_role;

ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active variants" ON public.store_product_variants
  FOR SELECT TO anon USING (
    active = true AND
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active')
  );
CREATE POLICY "Auth full access variants" ON public.store_product_variants
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER store_product_variants_updated_at
  BEFORE UPDATE ON public.store_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_store_product_variants_product ON public.store_product_variants(product_id);

-- 5. store_carts (carrinho anônimo por session_token OU logado por user_id)
CREATE TABLE IF NOT EXISTS public.store_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_carts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_carts TO authenticated;
GRANT ALL ON public.store_carts TO service_role;

ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;

-- Anon carts via session token (server-managed only via service_role in practice)
CREATE POLICY "Own cart access" ON public.store_carts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER store_carts_updated_at
  BEFORE UPDATE ON public.store_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. store_cart_items
CREATE TABLE IF NOT EXISTS public.store_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.store_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_cart_items TO authenticated;
GRANT ALL ON public.store_cart_items TO service_role;

ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own cart items access" ON public.store_cart_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.store_carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

CREATE INDEX idx_store_cart_items_cart ON public.store_cart_items(cart_id);

-- 7. store_orders (loja pública - separado do CRM orders existente)
CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('AMT-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_document TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_address JSONB,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  shipping_method TEXT,
  shipping_tracking TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own orders read" ON public.store_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth manage orders" ON public.store_orders
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
CREATE INDEX idx_store_orders_status ON public.store_orders(status);
CREATE INDEX idx_store_orders_created ON public.store_orders(created_at DESC);

-- 8. store_order_items
CREATE TABLE IF NOT EXISTS public.store_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  sku TEXT,
  image_url TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_order_items TO authenticated;
GRANT ALL ON public.store_order_items TO service_role;

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own order items read" ON public.store_order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Auth manage order items" ON public.store_order_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);

-- 9. store_import_jobs
CREATE TABLE IF NOT EXISTS public.store_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_urls INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  log JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_import_jobs TO authenticated;
GRANT ALL ON public.store_import_jobs TO service_role;

ALTER TABLE public.store_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access import jobs" ON public.store_import_jobs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER store_import_jobs_updated_at
  BEFORE UPDATE ON public.store_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
