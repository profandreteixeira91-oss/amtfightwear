
CREATE TABLE IF NOT EXISTS public.dojo_owner_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  categories JSONB NOT NULL DEFAULT jsonb_build_object(
    'sales', true,
    'enrollments', true,
    'graduations', true,
    'store_orders', true,
    'support', true,
    'system', true
  ),
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_owner_push_user ON public.dojo_owner_push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_owner_push_subscriptions TO authenticated;
GRANT ALL ON public.dojo_owner_push_subscriptions TO service_role;

ALTER TABLE public.dojo_owner_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can manage own push subs"
  ON public.dojo_owner_push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_dojo_owner_push_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_dojo_owner_push_updated ON public.dojo_owner_push_subscriptions;
CREATE TRIGGER trg_dojo_owner_push_updated
  BEFORE UPDATE ON public.dojo_owner_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_dojo_owner_push_updated();
