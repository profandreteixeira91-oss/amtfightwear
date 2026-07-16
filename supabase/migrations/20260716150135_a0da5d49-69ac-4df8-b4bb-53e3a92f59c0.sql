
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS installments INTEGER,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS asaas_boleto_url TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_copy_paste TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS payment_raw JSONB;

CREATE INDEX IF NOT EXISTS idx_store_orders_asaas_payment_id ON public.store_orders(asaas_payment_id);
