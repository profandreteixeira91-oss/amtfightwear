
-- Preços de graduação por faixa (map belt_id -> preço) e vínculo com contas a receber
ALTER TABLE public.dojo_graduation_settings
  ADD COLUMN IF NOT EXISTS price_by_belt jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.dojo_graduations
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.dojo_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dojo_graduations_invoice ON public.dojo_graduations(invoice_id);
