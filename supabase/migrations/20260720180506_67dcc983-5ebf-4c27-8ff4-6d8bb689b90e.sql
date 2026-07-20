
-- ============ dojo_academy_profile ============
ALTER TABLE public.dojo_academy_profile
  ADD COLUMN IF NOT EXISTS asaas_subaccount_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_onboarding_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS asaas_onboarding_url TEXT,
  ADD COLUMN IF NOT EXISTS asaas_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT;

CREATE INDEX IF NOT EXISTS idx_dojo_academy_asaas_wallet ON public.dojo_academy_profile(asaas_wallet_id) WHERE asaas_wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dojo_academy_asaas_subaccount ON public.dojo_academy_profile(asaas_subaccount_id) WHERE asaas_subaccount_id IS NOT NULL;

-- ============ dojo_invoices ============
ALTER TABLE public.dojo_invoices
  ADD COLUMN IF NOT EXISTS asaas_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_qrcode TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_copypaste TEXT,
  ADD COLUMN IF NOT EXISTS split_config JSONB,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mercadopago';

CREATE INDEX IF NOT EXISTS idx_dojo_invoices_asaas_charge ON public.dojo_invoices(asaas_charge_id) WHERE asaas_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dojo_invoices_asaas_subscription ON public.dojo_invoices(asaas_subscription_id) WHERE asaas_subscription_id IS NOT NULL;

-- ============ dojo_withdrawals ============
ALTER TABLE public.dojo_withdrawals
  ADD COLUMN IF NOT EXISTS asaas_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_transfer_status TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_dojo_withdrawals_asaas_transfer ON public.dojo_withdrawals(asaas_transfer_id) WHERE asaas_transfer_id IS NOT NULL;
