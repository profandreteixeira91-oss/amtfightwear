
ALTER TABLE public.dojo_api_keys ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE public.dojo_webhook_endpoints ADD COLUMN IF NOT EXISTS module text;
CREATE INDEX IF NOT EXISTS dojo_api_keys_owner_module_idx ON public.dojo_api_keys(owner_id, module);
CREATE INDEX IF NOT EXISTS dojo_webhook_endpoints_owner_module_idx ON public.dojo_webhook_endpoints(owner_id, module);
