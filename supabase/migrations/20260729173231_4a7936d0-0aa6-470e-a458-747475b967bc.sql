CREATE TABLE public.store_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_company TEXT,
  customer_document TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  valid_until DATE,
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,
  signer_name TEXT,
  signer_role TEXT,
  signature_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_quotes TO authenticated;
GRANT ALL ON public.store_quotes TO service_role;

ALTER TABLE public.store_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their quotes" ON public.store_quotes
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_store_quotes_owner_created ON public.store_quotes (owner_id, created_at DESC);

CREATE TRIGGER update_store_quotes_updated_at
  BEFORE UPDATE ON public.store_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();