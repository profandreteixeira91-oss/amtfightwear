
-- 1. dojo_affiliates
CREATE TABLE IF NOT EXISTS public.dojo_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  affiliation_number text NOT NULL,
  status text NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise','ativo','suspenso','cancelado')),
  academy_name text NOT NULL,
  trade_name text,
  legal_name text,
  cnpj text,
  state_registration text,
  manager_name text,
  manager_cpf text,
  manager_rg text,
  manager_email text,
  manager_phone text,
  zip text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  country text DEFAULT 'BR',
  phone text,
  whatsapp text,
  email text,
  website text,
  socials jsonb DEFAULT '{}'::jsonb,
  logo_url text,
  banner_url text,
  facade_url text,
  gallery_urls text[] DEFAULT ARRAY[]::text[],
  modalities text[] DEFAULT ARRAY[]::text[],
  teacher jsonb DEFAULT '{}'::jsonb,
  joined_at date,
  expires_at date,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, affiliation_number)
);
CREATE INDEX IF NOT EXISTS idx_dojo_affiliates_owner ON public.dojo_affiliates(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_affiliates_status ON public.dojo_affiliates(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_affiliates TO authenticated;
GRANT ALL ON public.dojo_affiliates TO service_role;
ALTER TABLE public.dojo_affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own affiliates"
  ON public.dojo_affiliates FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_dojo_affiliates_updated ON public.dojo_affiliates;
CREATE TRIGGER trg_dojo_affiliates_updated
  BEFORE UPDATE ON public.dojo_affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. dojo_affiliate_contracts
CREATE TABLE IF NOT EXISTS public.dojo_affiliate_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  affiliate_id uuid NOT NULL REFERENCES public.dojo_affiliates(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Contrato de Filiação',
  html_content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  signature_status text NOT NULL DEFAULT 'draft' CHECK (signature_status IN ('draft','pending','signed','cancelled')),
  signature_data jsonb DEFAULT '{}'::jsonb,
  signed_at timestamptz,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dojo_affiliate_contracts_owner ON public.dojo_affiliate_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_affiliate_contracts_affiliate ON public.dojo_affiliate_contracts(affiliate_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_affiliate_contracts TO authenticated;
GRANT ALL ON public.dojo_affiliate_contracts TO service_role;
ALTER TABLE public.dojo_affiliate_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own affiliate contracts"
  ON public.dojo_affiliate_contracts FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_dojo_affiliate_contracts_updated ON public.dojo_affiliate_contracts;
CREATE TRIGGER trg_dojo_affiliate_contracts_updated
  BEFORE UPDATE ON public.dojo_affiliate_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Extend dojo_invoices with affiliate integration
ALTER TABLE public.dojo_invoices
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.dojo_affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'student' CHECK (source IN ('student','affiliate','sale','other'));

CREATE INDEX IF NOT EXISTS idx_dojo_invoices_affiliate ON public.dojo_invoices(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_dojo_invoices_source ON public.dojo_invoices(source);

-- Allow student_id nullable when source != 'student' (needed for affiliate/sale invoices)
ALTER TABLE public.dojo_invoices ALTER COLUMN student_id DROP NOT NULL;

-- 4. Add affiliate_id to dojo_certificates (optional link)
ALTER TABLE public.dojo_certificates
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.dojo_affiliates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_dojo_certificates_affiliate ON public.dojo_certificates(affiliate_id);
