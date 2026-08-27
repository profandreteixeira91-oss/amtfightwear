CREATE TABLE IF NOT EXISTS public.store_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  event text NOT NULL,
  message text,
  metadata jsonb,
  actor_user_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_order_events_order_idx ON public.store_order_events(order_id, created_at DESC);

GRANT SELECT ON public.store_order_events TO authenticated;
GRANT ALL ON public.store_order_events TO service_role;

ALTER TABLE public.store_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMT admins can read order events"
ON public.store_order_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'amt_admin'));