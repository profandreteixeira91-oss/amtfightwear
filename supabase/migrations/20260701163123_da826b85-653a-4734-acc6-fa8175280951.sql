
-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  name text NOT NULL,
  category text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete products" ON public.products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  city text,
  state text,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  segment text NOT NULL DEFAULT 'new',
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update customers" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete customers" ON public.customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'site',
  status text NOT NULL DEFAULT 'pending',
  total numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete orders" ON public.orders FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX orders_placed_at_idx ON public.orders(placed_at DESC);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update order_items" ON public.order_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete order_items" ON public.order_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- MARKET METRICS
CREATE TABLE public.market_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  metric text NOT NULL,
  value numeric(14,4) NOT NULL DEFAULT 0,
  period_start date,
  period_end date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_metrics TO authenticated;
GRANT ALL ON public.market_metrics TO service_role;
ALTER TABLE public.market_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read market" ON public.market_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write market" ON public.market_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update market" ON public.market_metrics FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete market" ON public.market_metrics FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- CRM DEALS
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'lead',
  value numeric(12,2) NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 0,
  expected_close_at date,
  owner_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read deals" ON public.crm_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write deals" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update deals" ON public.crm_deals FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete deals" ON public.crm_deals FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER crm_deals_updated_at BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- KPI SNAPSHOTS
CREATE TABLE public.kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value numeric(14,4) NOT NULL DEFAULT 0,
  target numeric(14,4),
  reference_date date NOT NULL DEFAULT CURRENT_DATE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_snapshots TO authenticated;
GRANT ALL ON public.kpi_snapshots TO service_role;
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read kpis" ON public.kpi_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write kpis" ON public.kpi_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update kpis" ON public.kpi_snapshots FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete kpis" ON public.kpi_snapshots FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE INDEX kpi_ref_date_idx ON public.kpi_snapshots(reference_date DESC);

-- AI INSIGHTS
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  summary text,
  severity text NOT NULL DEFAULT 'info',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read insights" ON public.ai_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write insights" ON public.ai_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update insights" ON public.ai_insights FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete insights" ON public.ai_insights FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
