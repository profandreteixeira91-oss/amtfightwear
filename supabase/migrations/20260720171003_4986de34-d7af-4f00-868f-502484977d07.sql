
-- =====================================================
-- MÓDULO EQUIPE (Fase 1)
-- =====================================================

-- ---------- dojo_team_members ----------
CREATE TABLE public.dojo_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  legacy_unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,

  -- Dados pessoais
  full_name TEXT NOT NULL,
  photo_url TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,

  -- Dados profissionais
  role TEXT NOT NULL DEFAULT 'teacher',
  -- teacher | instructor | assistant | receptionist | finance | admin | manager | other
  admission_date DATE,
  termination_date DATE,
  professional_registry TEXT,
  belt_id UUID REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  belt_grade INTEGER,
  modalities JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialties TEXT,
  biography TEXT,
  mini_resume TEXT,
  professional_photo_url TEXT,

  status TEXT NOT NULL DEFAULT 'active',
  -- active | inactive | leave | vacation | terminated

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_owner ON public.dojo_team_members(owner_id);
CREATE INDEX idx_team_members_user ON public.dojo_team_members(user_id);
CREATE INDEX idx_team_members_status ON public.dojo_team_members(owner_id, status);
CREATE INDEX idx_team_members_role ON public.dojo_team_members(owner_id, role);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_members TO authenticated;
GRANT ALL ON public.dojo_team_members TO service_role;

ALTER TABLE public.dojo_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their team" ON public.dojo_team_members
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view themselves" ON public.dojo_team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_team_members_updated
  BEFORE UPDATE ON public.dojo_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_payroll_config ----------
CREATE TABLE public.dojo_team_payroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  payment_type TEXT NOT NULL DEFAULT 'fixed',
  -- fixed | hourly | per_class | percentage | commission | contractor | mei | autonomous | other
  base_salary NUMERIC(12,2),
  hourly_rate NUMERIC(12,2),
  per_class_rate NUMERIC(12,2),
  commission_percent NUMERIC(6,3),
  commission_on_enrollment NUMERIC(12,2),
  commission_on_renewal NUMERIC(12,2),
  commission_on_sale NUMERIC(12,2),

  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  tax_id TEXT, -- CPF/CNPJ
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

CREATE INDEX idx_team_payroll_owner ON public.dojo_team_payroll_config(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_payroll_config TO authenticated;
GRANT ALL ON public.dojo_team_payroll_config TO service_role;

ALTER TABLE public.dojo_team_payroll_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage payroll config" ON public.dojo_team_payroll_config
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own payroll" ON public.dojo_team_payroll_config
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_team_payroll_config_updated
  BEFORE UPDATE ON public.dojo_team_payroll_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_payments ----------
CREATE TABLE public.dojo_team_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  kind TEXT NOT NULL DEFAULT 'salary',
  -- salary | advance | discount | bonus | commission | overtime | reimbursement | other
  reference_month DATE, -- primeiro dia do mês de competência
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  hours_worked NUMERIC(8,2),
  classes_count INTEGER,

  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | canceled
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_payments_owner ON public.dojo_team_payments(owner_id);
CREATE INDEX idx_team_payments_member ON public.dojo_team_payments(member_id);
CREATE INDEX idx_team_payments_status ON public.dojo_team_payments(owner_id, status);
CREATE INDEX idx_team_payments_month ON public.dojo_team_payments(owner_id, reference_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_payments TO authenticated;
GRANT ALL ON public.dojo_team_payments TO service_role;

ALTER TABLE public.dojo_team_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage team payments" ON public.dojo_team_payments
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own payments" ON public.dojo_team_payments
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_team_payments_updated
  BEFORE UPDATE ON public.dojo_team_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_attendance ----------
CREATE TABLE public.dojo_team_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  hours_worked NUMERIC(6,2),
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'present',
  -- present | absent | late | justified | leave | holiday

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_attendance_owner ON public.dojo_team_attendance(owner_id);
CREATE INDEX idx_team_attendance_member ON public.dojo_team_attendance(member_id, work_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_attendance TO authenticated;
GRANT ALL ON public.dojo_team_attendance TO service_role;

ALTER TABLE public.dojo_team_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage team attendance" ON public.dojo_team_attendance
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own attendance" ON public.dojo_team_attendance
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_team_attendance_updated
  BEFORE UPDATE ON public.dojo_team_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_documents ----------
CREATE TABLE public.dojo_team_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  kind TEXT NOT NULL DEFAULT 'other',
  -- contract | rg | cpf | proof | certificate | course | diploma | other
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  notes TEXT,

  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_documents_owner ON public.dojo_team_documents(owner_id);
CREATE INDEX idx_team_documents_member ON public.dojo_team_documents(member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_documents TO authenticated;
GRANT ALL ON public.dojo_team_documents TO service_role;

ALTER TABLE public.dojo_team_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage team docs" ON public.dojo_team_documents
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own docs" ON public.dojo_team_documents
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_team_documents_updated
  BEFORE UPDATE ON public.dojo_team_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_signatures ----------
CREATE TABLE public.dojo_team_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  signature_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role_label TEXT,
  belt_label TEXT,
  can_sign_certificates BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

CREATE INDEX idx_team_signatures_owner ON public.dojo_team_signatures(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_signatures TO authenticated;
GRANT ALL ON public.dojo_team_signatures TO service_role;

ALTER TABLE public.dojo_team_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage signatures" ON public.dojo_team_signatures
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own signature" ON public.dojo_team_signatures
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_team_signatures_updated
  BEFORE UPDATE ON public.dojo_team_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- dojo_team_history ----------
CREATE TABLE public.dojo_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  -- profile_change | role_change | belt_change | schedule_change | salary_change | payment | permission_change | log
  description TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_history_owner ON public.dojo_team_history(owner_id);
CREATE INDEX idx_team_history_member ON public.dojo_team_history(member_id, created_at DESC);

GRANT SELECT, INSERT ON public.dojo_team_history TO authenticated;
GRANT ALL ON public.dojo_team_history TO service_role;

ALTER TABLE public.dojo_team_history ENABLE ROW LEVEL SECURITY;

-- Insert-only for owners; no update/delete policies -> immutable audit.
CREATE POLICY "Owners view team history" ON public.dojo_team_history
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners insert team history" ON public.dojo_team_history
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members view own history" ON public.dojo_team_history
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.dojo_team_members WHERE user_id = auth.uid()));
