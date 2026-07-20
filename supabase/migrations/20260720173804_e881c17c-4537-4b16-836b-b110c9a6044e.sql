
-- ============================================================
-- AMT Pay — Split de pagamento centralizado
-- ============================================================

-- 1) dojo_split_config: config de repasse por dojo
CREATE TABLE IF NOT EXISTS public.dojo_split_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  amt_percent numeric(6,3) NOT NULL DEFAULT 10.000,
  amt_fixed_fee numeric(12,2) NOT NULL DEFAULT 0.00,
  min_withdrawal numeric(12,2) NOT NULL DEFAULT 50.00,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dojo_split_config TO authenticated;
GRANT ALL ON public.dojo_split_config TO service_role;

ALTER TABLE public.dojo_split_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dojo owner reads own split config"
  ON public.dojo_split_config FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "amt admin manages split config"
  ON public.dojo_split_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER dojo_split_config_updated_at
  BEFORE UPDATE ON public.dojo_split_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) dojo_split_transactions
CREATE TABLE IF NOT EXISTS public.dojo_split_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  invoice_id uuid,
  student_id uuid,
  mp_payment_id text NOT NULL,
  operation_type text NOT NULL DEFAULT 'monthly',
  gross_amount numeric(12,2) NOT NULL,
  mp_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  amt_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  dojo_net_amount numeric(12,2) NOT NULL,
  amt_percent_applied numeric(6,3),
  amt_fixed_applied numeric(12,2),
  status text NOT NULL DEFAULT 'approved',
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dojo_split_tx_mp_payment_uniq
  ON public.dojo_split_transactions(mp_payment_id);
CREATE INDEX IF NOT EXISTS dojo_split_tx_owner_idx
  ON public.dojo_split_transactions(owner_id, created_at DESC);

GRANT SELECT ON public.dojo_split_transactions TO authenticated;
GRANT ALL ON public.dojo_split_transactions TO service_role;

ALTER TABLE public.dojo_split_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dojo owner reads own split tx"
  ON public.dojo_split_transactions FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER dojo_split_tx_updated_at
  BEFORE UPDATE ON public.dojo_split_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) referência opcional em wallet_transactions
ALTER TABLE public.dojo_wallet_transactions
  ADD COLUMN IF NOT EXISTS split_transaction_id uuid;

-- 4) Configuração padrão para todos os donos existentes
INSERT INTO public.dojo_split_config (owner_id, amt_percent, amt_fixed_fee)
SELECT DISTINCT owner_id, 10.000, 0.00
FROM public.dojo_academy_profile
ON CONFLICT (owner_id) DO NOTHING;
