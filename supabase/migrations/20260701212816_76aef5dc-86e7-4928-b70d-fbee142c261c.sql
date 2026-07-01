
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS reviews_count int,
  ADD COLUMN IF NOT EXISTS business_hours jsonb,
  ADD COLUMN IF NOT EXISTS ai_score int,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_approach text,
  ADD COLUMN IF NOT EXISTS ai_best_hour text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS enrichment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS technologies text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_leads_city_state ON public.leads(city, state);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON public.leads(ai_score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lat_lng ON public.leads(lat, lng);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_id);

CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  city text,
  state text,
  theme text,
  query text,
  status text NOT NULL DEFAULT 'running',
  found int DEFAULT 0,
  inserted int DEFAULT 0,
  duration_ms int,
  error text,
  triggered_by text DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_runs TO authenticated;
GRANT ALL ON public.scrape_runs TO service_role;
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all scrape_runs" ON public.scrape_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lead_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_enrichments TO authenticated;
GRANT ALL ON public.lead_enrichments TO service_role;
ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all lead_enrichments" ON public.lead_enrichments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_lead_enrichments_lead ON public.lead_enrichments(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_history TO authenticated;
GRANT ALL ON public.lead_history TO service_role;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all lead_history" ON public.lead_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_history(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  format text NOT NULL,
  filters jsonb,
  count int DEFAULT 0,
  file_url text,
  status text DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_exports TO authenticated;
GRANT ALL ON public.lead_exports TO service_role;
ALTER TABLE public.lead_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all lead_exports" ON public.lead_exports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.scraper_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  kind text NOT NULL,
  schedule_cron text NOT NULL,
  params jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_automations TO authenticated;
GRANT ALL ON public.scraper_automations TO service_role;
ALTER TABLE public.scraper_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all scraper_automations" ON public.scraper_automations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.scraper_settings (
  user_id uuid PRIMARY KEY,
  max_results_per_search int DEFAULT 50,
  timeout_ms int DEFAULT 30000,
  interval_ms int DEFAULT 2000,
  max_concurrency int DEFAULT 3,
  credits_available int DEFAULT 1000,
  credits_used int DEFAULT 0,
  webhook_url text,
  webhook_secret text,
  auto_enrich boolean DEFAULT true,
  auto_score boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_settings TO authenticated;
GRANT ALL ON public.scraper_settings TO service_role;
ALTER TABLE public.scraper_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own scraper_settings" ON public.scraper_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.scraper_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_logs TO authenticated;
GRANT ALL ON public.scraper_logs TO service_role;
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated all scraper_logs" ON public.scraper_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created ON public.scraper_logs(created_at DESC);

DROP TRIGGER IF EXISTS trg_scrape_runs_updated ON public.scrape_runs;
CREATE TRIGGER trg_scrape_runs_updated BEFORE UPDATE ON public.scrape_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_scraper_automations_updated ON public.scraper_automations;
CREATE TRIGGER trg_scraper_automations_updated BEFORE UPDATE ON public.scraper_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_scraper_settings_updated ON public.scraper_settings;
CREATE TRIGGER trg_scraper_settings_updated BEFORE UPDATE ON public.scraper_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
