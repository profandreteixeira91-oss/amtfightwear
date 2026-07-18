
-- Fase 2: Check-in, presenças e integrações GymPass/TotalPass

-- Presenças / check-ins
CREATE TABLE public.dojo_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'manual', -- manual | qr | pin | gympass | totalpass
  source text, -- external ref (gympass token, totalpass code)
  external_user text, -- id/email do usuário externo (gympass/totalpass)
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_attendance_student ON public.dojo_attendance(student_id, checked_in_at DESC);
CREATE INDEX idx_dojo_attendance_unit_date ON public.dojo_attendance(unit_id, checked_in_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_attendance TO authenticated;
GRANT ALL ON public.dojo_attendance TO service_role;
ALTER TABLE public.dojo_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance" ON public.dojo_attendance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own attendance" ON public.dojo_attendance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dojo_students s
    WHERE s.id = dojo_attendance.student_id AND s.user_id = auth.uid()
  ));

-- Códigos de check-in por aluno (PIN estável + QR rotativo)
ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS checkin_pin text,
  ADD COLUMN IF NOT EXISTS qr_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dojo_students_pin ON public.dojo_students(checkin_pin) WHERE checkin_pin IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dojo_students_qr ON public.dojo_students(qr_token) WHERE qr_token IS NOT NULL;

-- Integrações de parceiros (GymPass, TotalPass)
CREATE TABLE public.dojo_partner_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE, -- 'gympass' | 'totalpass'
  enabled boolean NOT NULL DEFAULT false,
  api_key_hint text,
  webhook_secret text,
  unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_partner_integrations TO authenticated;
GRANT ALL ON public.dojo_partner_integrations TO service_role;
ALTER TABLE public.dojo_partner_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner integrations" ON public.dojo_partner_integrations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dojo_partner_integrations_updated
  BEFORE UPDATE ON public.dojo_partner_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Log de validações externas (auditoria GymPass/TotalPass)
CREATE TABLE public.dojo_partner_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_user text,
  token text,
  status text NOT NULL, -- 'approved' | 'denied' | 'error'
  reason text,
  payload jsonb,
  attendance_id uuid REFERENCES public.dojo_attendance(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_partner_checkins_provider ON public.dojo_partner_checkins(provider, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_partner_checkins TO authenticated;
GRANT ALL ON public.dojo_partner_checkins TO service_role;
ALTER TABLE public.dojo_partner_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partner checkins" ON public.dojo_partner_checkins
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
