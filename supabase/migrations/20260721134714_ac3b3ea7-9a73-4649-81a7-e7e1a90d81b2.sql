
-- ================================================================
-- AMT Pay Fase 1 — Fundação
-- Novas tabelas: payment_settings, pix_keys, audit_logs
-- ================================================================

-- ------------------------------------------------------------
-- 1) dojo_payment_settings — taxas parametrizáveis por dojo
-- ------------------------------------------------------------
CREATE TABLE public.dojo_payment_settings (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- taxas do gateway (%)
  pix_fee_percent      NUMERIC(6,4) NOT NULL DEFAULT 0.0099,   -- 0,99%
  pix_fee_fixed        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  boleto_fee_percent   NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
  boleto_fee_fixed     NUMERIC(12,2) NOT NULL DEFAULT 1.99,
  card_upfront_percent NUMERIC(6,4) NOT NULL DEFAULT 0.0299,   -- 2,99%
  card_upfront_fixed   NUMERIC(12,2) NOT NULL DEFAULT 0.49,
  card_inst_percent    NUMERIC(6,4) NOT NULL DEFAULT 0.0349,   -- 3,49% parcelado
  card_inst_fixed      NUMERIC(12,2) NOT NULL DEFAULT 0.49,
  card_extra_per_inst  NUMERIC(6,4) NOT NULL DEFAULT 0.0000,   -- adicional por parcela
  -- taxa AMT (2% fixo)
  platform_fee_percent NUMERIC(6,4) NOT NULL DEFAULT 0.0200,
  platform_fee_fixed   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  -- moeda / gateway padrão
  currency TEXT NOT NULL DEFAULT 'BRL',
  default_gateway TEXT NOT NULL DEFAULT 'asaas',
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_payment_settings TO authenticated;
GRANT ALL ON public.dojo_payment_settings TO service_role;

ALTER TABLE public.dojo_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own payment settings"
  ON public.dojo_payment_settings
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_dojo_payment_settings_updated
  BEFORE UPDATE ON public.dojo_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 2) dojo_pix_keys — chaves PIX cadastradas para saque
-- ------------------------------------------------------------
CREATE TABLE public.dojo_pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL CHECK (key_type IN ('cpf','cnpj','email','phone','random')),
  key_value TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  holder_document TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dojo_pix_keys_owner ON public.dojo_pix_keys(owner_id, active);
CREATE UNIQUE INDEX uniq_dojo_pix_keys_owner_value ON public.dojo_pix_keys(owner_id, key_value) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_pix_keys TO authenticated;
GRANT ALL ON public.dojo_pix_keys TO service_role;

ALTER TABLE public.dojo_pix_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own pix keys"
  ON public.dojo_pix_keys
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_dojo_pix_keys_updated
  BEFORE UPDATE ON public.dojo_pix_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3) dojo_audit_logs — auditoria financeira centralizada
-- ------------------------------------------------------------
CREATE TABLE public.dojo_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID,                              -- quem executou (pode ser o próprio owner ou membro)
  event_type TEXT NOT NULL,                   -- e.g. billing.created, payment.received, withdrawal.requested, webhook.received
  entity_type TEXT,                           -- e.g. billing, payment, withdrawal, subscription
  entity_id UUID,
  gateway TEXT,                               -- asaas | mercadopago | ...
  status TEXT,                                -- success | error | pending
  message TEXT,
  ip TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- request/response bruto
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dojo_audit_owner_date ON public.dojo_audit_logs(owner_id, created_at DESC);
CREATE INDEX idx_dojo_audit_entity ON public.dojo_audit_logs(entity_type, entity_id);
CREATE INDEX idx_dojo_audit_event ON public.dojo_audit_logs(owner_id, event_type, created_at DESC);

GRANT SELECT ON public.dojo_audit_logs TO authenticated;
GRANT ALL ON public.dojo_audit_logs TO service_role;

ALTER TABLE public.dojo_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own audit logs"
  ON public.dojo_audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
