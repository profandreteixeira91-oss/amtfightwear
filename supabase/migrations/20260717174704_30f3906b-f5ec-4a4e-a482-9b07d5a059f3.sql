
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_store_orders_mp_payment_id ON public.store_orders (mp_payment_id);
