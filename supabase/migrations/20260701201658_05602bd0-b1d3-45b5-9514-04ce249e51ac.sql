
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads(state);

ALTER TABLE public.outreach_settings
  ADD COLUMN IF NOT EXISTS priority_region text NOT NULL DEFAULT 'nordeste';
