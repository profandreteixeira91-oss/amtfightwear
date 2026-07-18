
-- 1) Ajuste do plano SaaS AMT Dojo Manager: R$69,90/mês
ALTER TABLE public.dojo_subscriptions ALTER COLUMN plan_amount SET DEFAULT 69.90;

-- 2) Gateways de pagamento por dono de dojo (para cobrar seus alunos)
CREATE TABLE IF NOT EXISTS public.dojo_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('mercadopago','asaas','pagseguro')),
  label text,
  access_token text,
  public_key text,
  webhook_secret text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_payment_gateways TO authenticated;
GRANT ALL ON public.dojo_payment_gateways TO service_role;

ALTER TABLE public.dojo_payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own gateways"
  ON public.dojo_payment_gateways
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_dojo_payment_gateways_updated
  BEFORE UPDATE ON public.dojo_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_dojo_payment_gateways_owner ON public.dojo_payment_gateways(owner_id);

-- 3) Garante apenas 1 gateway default por dono (parcial unique)
CREATE UNIQUE INDEX idx_dojo_payment_gateway_default_one
  ON public.dojo_payment_gateways(owner_id)
  WHERE is_default = true;
