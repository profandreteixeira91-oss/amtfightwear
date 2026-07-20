-- ============================================================
-- AMT Pay — Carteira Financeira, Contas Bancárias e Saques
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.amtpay_bank_account_type AS ENUM ('checking', 'savings', 'payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_pix_key_type AS ENUM ('cpf', 'cnpj', 'email', 'phone', 'random');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_withdrawal_status AS ENUM (
    'requested', 'in_review', 'processing', 'paid', 'cancelled', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_tx_kind AS ENUM (
    'receipt',       -- recebimento (mensalidade, PIX, cartão, boleto, link)
    'fee',           -- taxa (gateway ou plataforma)
    'refund',        -- estorno
    'withdrawal',    -- saque
    'withdrawal_reversal', -- devolução de saque
    'adjustment',    -- ajuste manual
    'transfer_in',   -- transferência recebida
    'transfer_out'   -- transferência enviada
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_tx_method AS ENUM (
    'pix', 'card', 'boleto', 'link', 'cash', 'transfer', 'internal', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_tx_status AS ENUM ('pending', 'available', 'blocked', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.amtpay_payout_mode AS ENUM ('manual', 'daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) CONTAS BANCÁRIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dojo_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  -- Dados bancários
  bank_code TEXT,
  bank_name TEXT,
  account_type public.amtpay_bank_account_type NOT NULL DEFAULT 'checking',
  branch TEXT,
  branch_digit TEXT,
  account_number TEXT,
  account_digit TEXT,
  -- Titularidade
  holder_name TEXT NOT NULL,
  holder_document TEXT NOT NULL, -- CPF ou CNPJ
  -- PIX
  pix_key TEXT,
  pix_key_type public.amtpay_pix_key_type,
  -- Metadados
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_bank_accounts TO authenticated;
GRANT ALL ON public.dojo_bank_accounts TO service_role;

ALTER TABLE public.dojo_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own bank accounts"
  ON public.dojo_bank_accounts FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_dojo_bank_accounts_owner ON public.dojo_bank_accounts(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dojo_bank_account_primary
  ON public.dojo_bank_accounts(owner_id) WHERE is_primary = true AND active = true;

-- ============================================================
-- 2) CONFIGURAÇÕES DA CARTEIRA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dojo_wallet_settings (
  owner_id UUID NOT NULL PRIMARY KEY,
  min_withdrawal_amount NUMERIC(12,2) NOT NULL DEFAULT 20.00,
  withdrawal_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,  -- reservado para o futuro
  withdrawal_fee_percent NUMERIC(6,4) NOT NULL DEFAULT 0.0000, -- reservado para o futuro
  payout_mode public.amtpay_payout_mode NOT NULL DEFAULT 'manual',
  auto_release_days INTEGER NOT NULL DEFAULT 1, -- D+N até virar "available"
  currency TEXT NOT NULL DEFAULT 'BRL',
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_wallet_settings TO authenticated;
GRANT ALL ON public.dojo_wallet_settings TO service_role;

ALTER TABLE public.dojo_wallet_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own wallet settings"
  ON public.dojo_wallet_settings FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- 3) LIVRO-RAZÃO DE TRANSAÇÕES DA CARTEIRA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dojo_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  -- Classificação
  kind public.amtpay_tx_kind NOT NULL,
  method public.amtpay_tx_method NOT NULL DEFAULT 'other',
  status public.amtpay_tx_status NOT NULL DEFAULT 'available',
  -- Valores (sempre positivo; direction indica sinal)
  amount NUMERIC(12,2) NOT NULL,
  direction SMALLINT NOT NULL DEFAULT 1 CHECK (direction IN (1, -1)),
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL, -- amount - fee (com sinal via direction ao consultar)
  currency TEXT NOT NULL DEFAULT 'BRL',
  -- Rastreabilidade
  description TEXT,
  reference_type TEXT, -- 'invoice','withdrawal','manual','gateway_event','order' etc
  reference_id UUID,
  provider TEXT,       -- 'asaas','mercadopago','manual', etc
  provider_tx_id TEXT, -- id da transação no gateway
  student_id UUID,     -- opcional, quando aplicável
  -- Datas contábeis
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  available_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_wallet_transactions TO authenticated;
GRANT ALL ON public.dojo_wallet_transactions TO service_role;

ALTER TABLE public.dojo_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own wallet transactions"
  ON public.dojo_wallet_transactions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner inserts own wallet transactions"
  ON public.dojo_wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner updates own wallet transactions"
  ON public.dojo_wallet_transactions FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Não permitimos DELETE por RLS (histórico imutável). service_role pode.

CREATE INDEX IF NOT EXISTS idx_dojo_wallet_tx_owner_date
  ON public.dojo_wallet_transactions(owner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_dojo_wallet_tx_reference
  ON public.dojo_wallet_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_dojo_wallet_tx_status
  ON public.dojo_wallet_transactions(owner_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dojo_wallet_tx_provider_ref
  ON public.dojo_wallet_transactions(owner_id, provider, provider_tx_id, kind)
  WHERE provider IS NOT NULL AND provider_tx_id IS NOT NULL;

-- ============================================================
-- 4) SOLICITAÇÕES DE SAQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dojo_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  bank_account_id UUID REFERENCES public.dojo_bank_accounts(id) ON DELETE SET NULL,
  -- Valores
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  -- Destino no momento do pedido (snapshot para preservar histórico)
  destination JSONB NOT NULL DEFAULT '{}'::jsonb, -- {bank,branch,account,holder,pix_key,pix_key_type}
  pix_key TEXT,
  pix_key_type public.amtpay_pix_key_type,
  -- Ciclo de vida
  status public.amtpay_withdrawal_status NOT NULL DEFAULT 'requested',
  provider TEXT,          -- gateway usado
  provider_tx_id TEXT,    -- código da transação
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.dojo_withdrawals TO authenticated;
GRANT ALL ON public.dojo_withdrawals TO service_role;

ALTER TABLE public.dojo_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own withdrawals"
  ON public.dojo_withdrawals FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner requests own withdrawal"
  ON public.dojo_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner updates own pending withdrawal"
  ON public.dojo_withdrawals FOR UPDATE
  USING (auth.uid() = owner_id AND status IN ('requested','in_review'))
  WITH CHECK (auth.uid() = owner_id);

-- Nunca excluir registros: sem policy de DELETE.

CREATE INDEX IF NOT EXISTS idx_dojo_withdrawals_owner
  ON public.dojo_withdrawals(owner_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_dojo_withdrawals_status
  ON public.dojo_withdrawals(owner_id, status);

-- ============================================================
-- 5) TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_dojo_bank_accounts_updated ON public.dojo_bank_accounts;
CREATE TRIGGER trg_dojo_bank_accounts_updated
  BEFORE UPDATE ON public.dojo_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dojo_wallet_settings_updated ON public.dojo_wallet_settings;
CREATE TRIGGER trg_dojo_wallet_settings_updated
  BEFORE UPDATE ON public.dojo_wallet_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dojo_wallet_tx_updated ON public.dojo_wallet_transactions;
CREATE TRIGGER trg_dojo_wallet_tx_updated
  BEFORE UPDATE ON public.dojo_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dojo_withdrawals_updated ON public.dojo_withdrawals;
CREATE TRIGGER trg_dojo_withdrawals_updated
  BEFORE UPDATE ON public.dojo_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6) VIEW: saldo consolidado da carteira
-- ============================================================
CREATE OR REPLACE VIEW public.dojo_wallet_balance AS
SELECT
  owner_id,
  COALESCE(SUM(CASE WHEN status = 'available' THEN direction * net_amount END), 0)::NUMERIC(14,2) AS available_balance,
  COALESCE(SUM(CASE WHEN status = 'pending'   THEN direction * net_amount END), 0)::NUMERIC(14,2) AS pending_balance,
  COALESCE(SUM(CASE WHEN status = 'blocked'   THEN direction * net_amount END), 0)::NUMERIC(14,2) AS blocked_balance,
  COALESCE(SUM(direction * net_amount), 0)::NUMERIC(14,2) AS total_balance,
  MAX(occurred_at) AS last_movement_at
FROM public.dojo_wallet_transactions
WHERE status <> 'reversed'
GROUP BY owner_id;

GRANT SELECT ON public.dojo_wallet_balance TO authenticated;
GRANT SELECT ON public.dojo_wallet_balance TO service_role;

-- Views não herdam RLS diretamente; a segurança vem da tabela subjacente.
ALTER VIEW public.dojo_wallet_balance SET (security_invoker = true);
