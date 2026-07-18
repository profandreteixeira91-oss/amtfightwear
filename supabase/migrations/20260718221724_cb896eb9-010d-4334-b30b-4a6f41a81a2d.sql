
-- Expand dojo_attendance for check-out, class linkage, security metadata, visitors
ALTER TABLE public.dojo_attendance
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.dojo_classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_phone text,
  ADD COLUMN IF NOT EXISTS visitor_origin text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'present';

CREATE INDEX IF NOT EXISTS idx_dojo_att_owner_time ON public.dojo_attendance (owner_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_dojo_att_owner_student_time ON public.dojo_attendance (owner_id, student_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_dojo_att_status ON public.dojo_attendance (owner_id, status);

-- Settings table for check-in module (per academy owner)
CREATE TABLE IF NOT EXISTS public.dojo_checkin_settings (
  owner_id uuid PRIMARY KEY,
  min_interval_minutes int NOT NULL DEFAULT 30,
  allow_multiple_daily boolean NOT NULL DEFAULT true,
  require_checkout boolean NOT NULL DEFAULT false,
  welcome_message text DEFAULT 'Bem-vindo, {{name}}! Bom treino 🥋',
  block_on_overdue boolean NOT NULL DEFAULT false,
  warn_on_overdue boolean NOT NULL DEFAULT true,
  warn_on_medical boolean NOT NULL DEFAULT true,
  require_partner_validation boolean NOT NULL DEFAULT true,
  kiosk_pin text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_checkin_settings TO authenticated;
GRANT ALL ON public.dojo_checkin_settings TO service_role;

ALTER TABLE public.dojo_checkin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own checkin settings"
  ON public.dojo_checkin_settings
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_dojo_checkin_settings_updated_at ON public.dojo_checkin_settings;
CREATE TRIGGER trg_dojo_checkin_settings_updated_at
  BEFORE UPDATE ON public.dojo_checkin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
