
-- Add Instagram / pipeline / AI fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS instagram_bio text,
  ADD COLUMN IF NOT EXISTS instagram_followers integer,
  ADD COLUMN IF NOT EXISTS instagram_verified boolean,
  ADD COLUMN IF NOT EXISTS instagram_is_business boolean,
  ADD COLUMN IF NOT EXISTS instagram_avatar_url text,
  ADD COLUMN IF NOT EXISTS website_title text,
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS ai_opportunities text,
  ADD COLUMN IF NOT EXISTS ai_recommended_channel text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_flag text;

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_instagram_handle ON public.leads(instagram_handle);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_website_unique ON public.leads(lower(website)) WHERE website IS NOT NULL AND website <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_instagram_unique ON public.leads(lower(instagram_handle)) WHERE instagram_handle IS NOT NULL AND instagram_handle <> '';

-- Email sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequences TO authenticated;
GRANT ALL ON public.email_sequences TO service_role;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage email_sequences" ON public.email_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_email_sequences_updated BEFORE UPDATE ON public.email_sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Email sequence runs
CREATE TABLE IF NOT EXISTS public.email_sequence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  last_step_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequence_runs TO authenticated;
GRANT ALL ON public.email_sequence_runs TO service_role;
ALTER TABLE public.email_sequence_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage sequence_runs" ON public.email_sequence_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sequence_runs_updated BEFORE UPDATE ON public.email_sequence_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sequence_runs_next_send ON public.email_sequence_runs(next_send_at) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_sequence_runs_lead ON public.email_sequence_runs(lead_id);
