
-- ==========================================================
-- PROSPECT ENGINE — reconstrução completa
-- Remove módulo antigo de Lead Scraper e cria nova arquitetura
-- ==========================================================

-- 1) DROP tabelas do módulo antigo
DROP TABLE IF EXISTS public.email_sequence_runs CASCADE;
DROP TABLE IF EXISTS public.email_sequences CASCADE;
DROP TABLE IF EXISTS public.outreach_log CASCADE;
DROP TABLE IF EXISTS public.outreach_settings CASCADE;
DROP TABLE IF EXISTS public.lead_enrichments CASCADE;
DROP TABLE IF EXISTS public.lead_history CASCADE;
DROP TABLE IF EXISTS public.lead_exports CASCADE;
DROP TABLE IF EXISTS public.scrape_runs CASCADE;
DROP TABLE IF EXISTS public.scraper_automations CASCADE;
DROP TABLE IF EXISTS public.scraper_logs CASCADE;
DROP TABLE IF EXISTS public.scraper_settings CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.prospect_pipeline_stage AS ENUM (
    'novo','captado','enriquecido','contato_iniciado','resposta_recebida',
    'reuniao','proposta','negociacao','cliente','perdido'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prospect_lead_status AS ENUM (
    'ativo','qualificado','desqualificado','em_contato','convertido','arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prospect_contact_channel AS ENUM ('email','whatsapp','instagram','phone','website');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prospect_job_status AS ENUM ('pending','running','success','failed','not_found');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) prospect_companies (lead principal)
CREATE TABLE public.prospect_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT,
  segment TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  postal_code TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  website TEXT,
  phone TEXT,
  business_hours TEXT,
  responsible_name TEXT,
  logo_url TEXT,
  origin TEXT,
  source_url TEXT,
  description TEXT,
  ai_summary TEXT,
  ai_pitch TEXT,
  best_channel public.prospect_contact_channel,
  score INT NOT NULL DEFAULT 0,
  status public.prospect_lead_status NOT NULL DEFAULT 'ativo',
  pipeline_stage public.prospect_pipeline_stage NOT NULL DEFAULT 'novo',
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, normalized_name, city)
);

CREATE INDEX idx_prospect_companies_owner ON public.prospect_companies(owner_id);
CREATE INDEX idx_prospect_companies_stage ON public.prospect_companies(owner_id, pipeline_stage);
CREATE INDEX idx_prospect_companies_status ON public.prospect_companies(owner_id, status);
CREATE INDEX idx_prospect_companies_state ON public.prospect_companies(state);
CREATE INDEX idx_prospect_companies_city ON public.prospect_companies(city);
CREATE INDEX idx_prospect_companies_score ON public.prospect_companies(owner_id, score DESC);
CREATE INDEX idx_prospect_companies_created ON public.prospect_companies(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_companies TO authenticated;
GRANT ALL ON public.prospect_companies TO service_role;
ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_companies" ON public.prospect_companies FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_prospect_companies_updated
  BEFORE UPDATE ON public.prospect_companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) prospect_contacts (canais normalizados)
CREATE TABLE public.prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  channel public.prospect_contact_channel NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, channel, value)
);

CREATE INDEX idx_prospect_contacts_company ON public.prospect_contacts(company_id);
CREATE INDEX idx_prospect_contacts_channel ON public.prospect_contacts(owner_id, channel);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_contacts TO authenticated;
GRANT ALL ON public.prospect_contacts TO service_role;
ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_contacts" ON public.prospect_contacts FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 5) prospect_searches
CREATE TABLE public.prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  keywords TEXT,
  category TEXT,
  target_count INT NOT NULL DEFAULT 20,
  filters JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'idle',
  results_count INT NOT NULL DEFAULT 0,
  scheduled_cron TEXT,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_searches TO authenticated;
GRANT ALL ON public.prospect_searches TO service_role;
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_searches" ON public.prospect_searches FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_prospect_searches_updated
  BEFORE UPDATE ON public.prospect_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) prospect_enrichment_jobs
CREATE TABLE public.prospect_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  status public.prospect_job_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  fields_found JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_jobs_status ON public.prospect_enrichment_jobs(status, created_at);
CREATE INDEX idx_prospect_jobs_owner ON public.prospect_enrichment_jobs(owner_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_enrichment_jobs TO authenticated;
GRANT ALL ON public.prospect_enrichment_jobs TO service_role;
ALTER TABLE public.prospect_enrichment_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_jobs" ON public.prospect_enrichment_jobs FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 7) prospect_timeline
CREATE TABLE public.prospect_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_timeline_company ON public.prospect_timeline(company_id, created_at DESC);
CREATE INDEX idx_prospect_timeline_owner ON public.prospect_timeline(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_timeline TO authenticated;
GRANT ALL ON public.prospect_timeline TO service_role;
ALTER TABLE public.prospect_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_timeline" ON public.prospect_timeline FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 8) prospect_sequences + steps + runs
CREATE TABLE public.prospect_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  cancel_on_reply BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_sequences TO authenticated;
GRANT ALL ON public.prospect_sequences TO service_role;
ALTER TABLE public.prospect_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sequences" ON public.prospect_sequences FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_prospect_sequences_updated
  BEFORE UPDATE ON public.prospect_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prospect_sequence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.prospect_sequences(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  next_run_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seq_runs_next ON public.prospect_sequence_runs(status, next_run_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_sequence_runs TO authenticated;
GRANT ALL ON public.prospect_sequence_runs TO service_role;
ALTER TABLE public.prospect_sequence_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_seq_runs" ON public.prospect_sequence_runs FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 9) prospect_automations
CREATE TABLE public.prospect_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  runs_count INT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_automations TO authenticated;
GRANT ALL ON public.prospect_automations TO service_role;
ALTER TABLE public.prospect_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_automations" ON public.prospect_automations FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_prospect_automations_updated
  BEFORE UPDATE ON public.prospect_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10) prospect_exports
CREATE TABLE public.prospect_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  columns TEXT[] NOT NULL DEFAULT '{}',
  rows_count INT NOT NULL DEFAULT 0,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_exports TO authenticated;
GRANT ALL ON public.prospect_exports TO service_role;
ALTER TABLE public.prospect_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_exports" ON public.prospect_exports FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- 11) prospect_settings (1 por user)
CREATE TABLE public.prospect_settings (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  required_fields TEXT[] NOT NULL DEFAULT ARRAY['email','whatsapp','instagram'],
  score_weights JSONB NOT NULL DEFAULT '{"email":25,"whatsapp":25,"instagram":20,"website":10,"phone":8,"address":4,"category":3,"city":3,"state":2}',
  search_interval_min INT NOT NULL DEFAULT 60,
  enrichment_interval_min INT NOT NULL DEFAULT 15,
  email_template TEXT,
  email_subject_template TEXT,
  whatsapp_template TEXT,
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_regions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_settings TO authenticated;
GRANT ALL ON public.prospect_settings TO service_role;
ALTER TABLE public.prospect_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_settings" ON public.prospect_settings FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_prospect_settings_updated
  BEFORE UPDATE ON public.prospect_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12) prospect_logs
CREATE TABLE public.prospect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_logs_owner ON public.prospect_logs(owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_logs TO authenticated;
GRANT ALL ON public.prospect_logs TO service_role;
ALTER TABLE public.prospect_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_logs" ON public.prospect_logs FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
