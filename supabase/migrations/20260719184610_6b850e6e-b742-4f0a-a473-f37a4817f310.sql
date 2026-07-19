
-- =============== dojo_store_settings ===============
CREATE TABLE public.dojo_store_settings (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wholesale_min_qty_per_product integer NOT NULL DEFAULT 6,
  wholesale_min_order_value numeric(12,2) NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_settings TO authenticated;
GRANT ALL ON public.dojo_store_settings TO service_role;
ALTER TABLE public.dojo_store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.dojo_store_settings FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_store_settings_updated BEFORE UPDATE ON public.dojo_store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== dojo_store_carts ===============
CREATE TABLE public.dojo_store_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_carts TO authenticated;
GRANT ALL ON public.dojo_store_carts TO service_role;
ALTER TABLE public.dojo_store_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.dojo_store_carts FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_store_carts_updated BEFORE UPDATE ON public.dojo_store_carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dojo_store_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.dojo_store_carts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  customization jsonb,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  billable_to_student boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_store_cart_items_cart ON public.dojo_store_cart_items(cart_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_cart_items TO authenticated;
GRANT ALL ON public.dojo_store_cart_items TO service_role;
ALTER TABLE public.dojo_store_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart items" ON public.dojo_store_cart_items FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_store_cart_items_updated BEFORE UPDATE ON public.dojo_store_cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== dojo_store_favorite_lists ===============
CREATE TABLE public.dojo_store_favorite_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_favorite_lists TO authenticated;
GRANT ALL ON public.dojo_store_favorite_lists TO service_role;
ALTER TABLE public.dojo_store_favorite_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fav lists" ON public.dojo_store_favorite_lists FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_store_favorite_lists_updated BEFORE UPDATE ON public.dojo_store_favorite_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dojo_store_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.dojo_store_favorite_lists(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, product_id, list_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_favorites TO authenticated;
GRANT ALL ON public.dojo_store_favorites TO service_role;
ALTER TABLE public.dojo_store_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.dojo_store_favorites FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =============== dojo_store_orders ===============
CREATE TABLE public.dojo_store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL,
  origin text NOT NULL DEFAULT 'dojo_manager',
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  order_number text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  retail_total numeric(12,2) NOT NULL DEFAULT 0,
  wholesale_total numeric(12,2) NOT NULL DEFAULT 0,
  savings numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  is_wholesale boolean NOT NULL DEFAULT false,
  tracking_code text,
  invoice_url text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_store_orders_owner ON public.dojo_store_orders(owner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_orders TO authenticated;
GRANT ALL ON public.dojo_store_orders TO service_role;
ALTER TABLE public.dojo_store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dojo orders" ON public.dojo_store_orders FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_store_orders_updated BEFORE UPDATE ON public.dojo_store_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dojo_store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.dojo_store_orders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text,
  image_url text,
  quantity integer NOT NULL,
  unit_retail_price numeric(12,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  customization jsonb,
  billable_to_student boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_store_order_items_order ON public.dojo_store_order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_order_items TO authenticated;
GRANT ALL ON public.dojo_store_order_items TO service_role;
ALTER TABLE public.dojo_store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dojo order items" ON public.dojo_store_order_items FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.dojo_store_order_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.dojo_store_orders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_store_order_timeline_order ON public.dojo_store_order_timeline(order_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_order_timeline TO authenticated;
GRANT ALL ON public.dojo_store_order_timeline TO service_role;
ALTER TABLE public.dojo_store_order_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dojo timeline" ON public.dojo_store_order_timeline FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =============== dojo_store_student_deliveries ===============
CREATE TABLE public.dojo_store_student_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.dojo_store_order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text,
  quantity integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_store_deliveries_student ON public.dojo_store_student_deliveries(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_student_deliveries TO authenticated;
GRANT ALL ON public.dojo_store_student_deliveries TO service_role;
ALTER TABLE public.dojo_store_student_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deliveries" ON public.dojo_store_student_deliveries FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =============== dojo_store_sync_logs ===============
CREATE TABLE public.dojo_store_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  products_count integer,
  categories_count integer,
  updated_count integer,
  error text,
  metadata jsonb
);
CREATE INDEX idx_dojo_store_sync_logs_owner ON public.dojo_store_sync_logs(owner_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_store_sync_logs TO authenticated;
GRANT ALL ON public.dojo_store_sync_logs TO service_role;
ALTER TABLE public.dojo_store_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync logs" ON public.dojo_store_sync_logs FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
