
-- =========================================
-- Corporate Benefits Integrations
-- =========================================
CREATE TABLE IF NOT EXISTS public.dojo_corporate_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gympass','totalpass')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','pending','error')),
  gym_code TEXT,
  academy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  auth_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_corporate_integrations TO authenticated;
GRANT ALL ON public.dojo_corporate_integrations TO service_role;

ALTER TABLE public.dojo_corporate_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages corporate integrations"
  ON public.dojo_corporate_integrations FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER dojo_corporate_integrations_updated_at
  BEFORE UPDATE ON public.dojo_corporate_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_dojo_corp_integrations_owner ON public.dojo_corporate_integrations(owner_id);

-- =========================================
-- Beneficiaries
-- =========================================
CREATE TABLE IF NOT EXISTS public.dojo_corporate_beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gympass','totalpass')),
  beneficiary_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','inactive','pending','blocked','expired')),
  plan_name TEXT,
  plan_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  eligible BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  last_check_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, student_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_corporate_beneficiaries TO authenticated;
GRANT ALL ON public.dojo_corporate_beneficiaries TO service_role;

ALTER TABLE public.dojo_corporate_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages beneficiaries"
  ON public.dojo_corporate_beneficiaries FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Student reads own benefit"
  ON public.dojo_corporate_beneficiaries FOR SELECT
  USING (student_id = public.get_my_student_id());

CREATE TRIGGER dojo_corporate_beneficiaries_updated_at
  BEFORE UPDATE ON public.dojo_corporate_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_dojo_corp_benef_owner ON public.dojo_corporate_beneficiaries(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_corp_benef_student ON public.dojo_corporate_beneficiaries(student_id);
CREATE INDEX IF NOT EXISTS idx_dojo_corp_benef_provider ON public.dojo_corporate_beneficiaries(owner_id, provider, status);

-- =========================================
-- Sync Logs
-- =========================================
CREATE TABLE IF NOT EXISTS public.dojo_corporate_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  provider TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_corporate_sync_logs TO authenticated;
GRANT ALL ON public.dojo_corporate_sync_logs TO service_role;

ALTER TABLE public.dojo_corporate_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads sync logs"
  ON public.dojo_corporate_sync_logs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner inserts sync logs"
  ON public.dojo_corporate_sync_logs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_dojo_corp_sync_logs_owner ON public.dojo_corporate_sync_logs(owner_id, provider, started_at DESC);

-- =========================================
-- History (permanent audit)
-- =========================================
CREATE TABLE IF NOT EXISTS public.dojo_corporate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  provider TEXT NOT NULL,
  event TEXT NOT NULL,
  actor UUID,
  actor_email TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dojo_corporate_history TO authenticated;
GRANT ALL ON public.dojo_corporate_history TO service_role;

ALTER TABLE public.dojo_corporate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads history"
  ON public.dojo_corporate_history FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner inserts history"
  ON public.dojo_corporate_history FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_dojo_corp_history_owner ON public.dojo_corporate_history(owner_id, created_at DESC);
