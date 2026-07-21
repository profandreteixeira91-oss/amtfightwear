
-- Fase 3: colunas de decomposição financeira nas faturas
ALTER TABLE public.dojo_invoices
  ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS gateway_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS net_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS fees_breakdown jsonb;

CREATE INDEX IF NOT EXISTS idx_dojo_invoices_paid_at ON public.dojo_invoices(paid_at);

-- Idempotência: um único crédito de recebimento por fatura
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_receipt_per_invoice
  ON public.dojo_wallet_transactions(owner_id, reference_type, reference_id)
  WHERE kind = 'receipt' AND direction = 1;

-- Idempotência: um estorno único por fatura
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_refund_per_invoice
  ON public.dojo_wallet_transactions(owner_id, reference_type, reference_id)
  WHERE kind = 'refund' AND direction = -1;
