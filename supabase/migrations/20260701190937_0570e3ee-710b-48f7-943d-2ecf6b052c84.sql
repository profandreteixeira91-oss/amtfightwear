
CREATE TABLE public.outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','instagram','whatsapp')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','queued','skipped')),
  subject text,
  body text,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outreach_log_lead_sent ON public.outreach_log(lead_id, sent_at DESC);
CREATE INDEX idx_outreach_log_sent_at ON public.outreach_log(sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_log TO authenticated;
GRANT ALL ON public.outreach_log TO service_role;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read outreach" ON public.outreach_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert outreach" ON public.outreach_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.outreach_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  daily_email_cap integer NOT NULL DEFAULT 40,
  daily_instagram_cap integer NOT NULL DEFAULT 15,
  weekly_cooldown_days integer NOT NULL DEFAULT 7,
  tone text NOT NULL DEFAULT 'consultivo',
  site_url text NOT NULL DEFAULT 'https://www.amtfightwear.com.br',
  from_email text,
  from_name text NOT NULL DEFAULT 'AMT Fight Wear',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_settings TO authenticated;
GRANT ALL ON public.outreach_settings TO service_role;
ALTER TABLE public.outreach_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage outreach settings" ON public.outreach_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_outreach_settings_updated BEFORE UPDATE ON public.outreach_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.outreach_settings (enabled) VALUES (false);
