
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS melhor_envio_service_id integer,
  ADD COLUMN IF NOT EXISTS melhor_envio_service_name text,
  ADD COLUMN IF NOT EXISTS melhor_envio_cart_id text,
  ADD COLUMN IF NOT EXISTS melhor_envio_order_id text,
  ADD COLUMN IF NOT EXISTS melhor_envio_protocol text,
  ADD COLUMN IF NOT EXISTS melhor_envio_label_url text,
  ADD COLUMN IF NOT EXISTS melhor_envio_status text,
  ADD COLUMN IF NOT EXISTS melhor_envio_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS melhor_envio_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_store_orders_me_order_id ON public.store_orders (melhor_envio_order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_me_cart_id ON public.store_orders (melhor_envio_cart_id);
