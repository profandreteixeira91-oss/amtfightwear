
CREATE TABLE public.dojo_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hashed_key TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dojo_api_keys(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_api_keys TO authenticated;
GRANT ALL ON public.dojo_api_keys TO service_role;
ALTER TABLE public.dojo_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api keys" ON public.dojo_api_keys FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.dojo_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_status INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dojo_webhook_endpoints(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_webhook_endpoints TO authenticated;
GRANT ALL ON public.dojo_webhook_endpoints TO service_role;
ALTER TABLE public.dojo_webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own webhook endpoints" ON public.dojo_webhook_endpoints FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.dojo_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES public.dojo_webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status INT,
  response TEXT,
  attempt INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dojo_webhook_deliveries(owner_id, created_at DESC);
CREATE INDEX ON public.dojo_webhook_deliveries(endpoint_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_webhook_deliveries TO authenticated;
GRANT ALL ON public.dojo_webhook_deliveries TO service_role;
ALTER TABLE public.dojo_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own webhook deliveries" ON public.dojo_webhook_deliveries FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
