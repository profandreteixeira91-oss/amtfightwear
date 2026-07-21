
-- Catálogo de produtos e serviços
CREATE TABLE public.dojo_sales_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'product' CHECK (kind IN ('product','service')),
  name text NOT NULL,
  description text,
  sku text,
  price numeric NOT NULL DEFAULT 0,
  cost numeric,
  stock integer,
  track_stock boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_sales_products_owner ON public.dojo_sales_products(owner_id);

-- Venda (header)
CREATE TABLE public.dojo_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  customer_name text,
  customer_document text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft','pending','paid','canceled')),
  invoice_id uuid REFERENCES public.dojo_invoices(id) ON DELETE SET NULL,
  payment_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_sales_owner ON public.dojo_sales(owner_id);
CREATE INDEX idx_dojo_sales_sold_at ON public.dojo_sales(sold_at DESC);

-- Itens da venda
CREATE TABLE public.dojo_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.dojo_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.dojo_sales_products(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'product',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_sale_items_sale ON public.dojo_sale_items(sale_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_sales_products TO authenticated;
GRANT ALL ON public.dojo_sales_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_sales TO authenticated;
GRANT ALL ON public.dojo_sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_sale_items TO authenticated;
GRANT ALL ON public.dojo_sale_items TO service_role;

ALTER TABLE public.dojo_sales_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dojo_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dojo_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_products_owner_all" ON public.dojo_sales_products
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "sales_owner_all" ON public.dojo_sales
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "sale_items_owner_all" ON public.dojo_sale_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dojo_sales s WHERE s.id = sale_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dojo_sales s WHERE s.id = sale_id AND s.owner_id = auth.uid()));

CREATE TRIGGER trg_dojo_sales_products_updated BEFORE UPDATE ON public.dojo_sales_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dojo_sales_updated BEFORE UPDATE ON public.dojo_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
