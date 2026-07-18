
-- Ensure admin role check exists (reuse existing has_role + app_role)
-- Units
CREATE TABLE public.dojo_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_units TO authenticated;
GRANT ALL ON public.dojo_units TO service_role;
ALTER TABLE public.dojo_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage units" ON public.dojo_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auth read units" ON public.dojo_units FOR SELECT TO authenticated USING (true);

-- Belts catalog (Jiu-Jitsu)
CREATE TABLE public.dojo_belts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#000000',
  sort_order INT NOT NULL,
  max_degrees INT NOT NULL DEFAULT 4,
  category TEXT NOT NULL DEFAULT 'adult',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_belts TO authenticated;
GRANT ALL ON public.dojo_belts TO service_role;
ALTER TABLE public.dojo_belts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read belts" ON public.dojo_belts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage belts" ON public.dojo_belts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students
CREATE TABLE public.dojo_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  current_belt_id UUID REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  current_degree INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive | frozen
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_students_user ON public.dojo_students(user_id);
CREATE INDEX idx_dojo_students_unit ON public.dojo_students(unit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_students TO authenticated;
GRANT ALL ON public.dojo_students TO service_role;
ALTER TABLE public.dojo_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage students" ON public.dojo_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students read own" ON public.dojo_students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Graduations
CREATE TABLE public.dojo_graduations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  belt_id UUID NOT NULL REFERENCES public.dojo_belts(id) ON DELETE RESTRICT,
  degree INT NOT NULL DEFAULT 0,
  graduation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluator TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_grads_student ON public.dojo_graduations(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_graduations TO authenticated;
GRANT ALL ON public.dojo_graduations TO service_role;
ALTER TABLE public.dojo_graduations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage grads" ON public.dojo_graduations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students read own grads" ON public.dojo_graduations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = student_id AND s.user_id = auth.uid()));

-- Plans
CREATE TABLE public.dojo_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_plans TO authenticated;
GRANT ALL ON public.dojo_plans TO service_role;
ALTER TABLE public.dojo_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read plans" ON public.dojo_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage plans" ON public.dojo_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enrollments
CREATE TABLE public.dojo_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.dojo_plans(id) ON DELETE RESTRICT,
  custom_amount NUMERIC(10,2),
  due_day INT NOT NULL DEFAULT 5,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_enroll_student ON public.dojo_enrollments(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_enrollments TO authenticated;
GRANT ALL ON public.dojo_enrollments TO service_role;
ALTER TABLE public.dojo_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage enroll" ON public.dojo_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students read own enroll" ON public.dojo_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = student_id AND s.user_id = auth.uid()));

-- Invoices (contas a receber / mensalidades)
CREATE TABLE public.dojo_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.dojo_enrollments(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
  payment_provider TEXT, -- mercadopago | manual | ...
  payment_id TEXT,
  payment_link TEXT,
  method TEXT, -- pix | card | cash | ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_inv_student ON public.dojo_invoices(student_id);
CREATE INDEX idx_dojo_inv_due ON public.dojo_invoices(due_date);
CREATE INDEX idx_dojo_inv_status ON public.dojo_invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_invoices TO authenticated;
GRANT ALL ON public.dojo_invoices TO service_role;
ALTER TABLE public.dojo_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage inv" ON public.dojo_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students read own inv" ON public.dojo_invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = student_id AND s.user_id = auth.uid()));

-- Expenses (contas a pagar)
CREATE TABLE public.dojo_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_expenses TO authenticated;
GRANT ALL ON public.dojo_expenses TO service_role;
ALTER TABLE public.dojo_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage exp" ON public.dojo_expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Certificate templates (customer uploads background and places fields)
CREATE TABLE public.dojo_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  background_url TEXT NOT NULL,
  width INT NOT NULL DEFAULT 1754,
  height INT NOT NULL DEFAULT 1240,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{key, label, x, y, fontSize, fontFamily, color, align, bold}]
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_certificate_templates TO authenticated;
GRANT ALL ON public.dojo_certificate_templates TO service_role;
ALTER TABLE public.dojo_certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read templates" ON public.dojo_certificate_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage templates" ON public.dojo_certificate_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Certificates emitted
CREATE TABLE public.dojo_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  graduation_id UUID REFERENCES public.dojo_graduations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.dojo_certificate_templates(id) ON DELETE SET NULL,
  public_hash TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  pdf_url TEXT,
  values JSONB NOT NULL DEFAULT '{}'::jsonb, -- snapshot of field values
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_cert_student ON public.dojo_certificates(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_certificates TO authenticated;
GRANT SELECT ON public.dojo_certificates TO anon;
GRANT ALL ON public.dojo_certificates TO service_role;
ALTER TABLE public.dojo_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage certs" ON public.dojo_certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students read own certs" ON public.dojo_certificates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "public verify cert" ON public.dojo_certificates FOR SELECT TO anon USING (true);

-- updated_at triggers (reusing existing set_updated_at)
CREATE TRIGGER trg_dojo_units_upd BEFORE UPDATE ON public.dojo_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_students_upd BEFORE UPDATE ON public.dojo_students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_plans_upd BEFORE UPDATE ON public.dojo_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_enroll_upd BEFORE UPDATE ON public.dojo_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_inv_upd BEFORE UPDATE ON public.dojo_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_exp_upd BEFORE UPDATE ON public.dojo_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dojo_tpl_upd BEFORE UPDATE ON public.dojo_certificate_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed BJJ adult belts
INSERT INTO public.dojo_belts (name, color_hex, sort_order, max_degrees, category) VALUES
  ('Branca', '#F5F5F5', 1, 4, 'adult'),
  ('Azul',   '#1E63C4', 2, 4, 'adult'),
  ('Roxa',   '#6A1B9A', 3, 4, 'adult'),
  ('Marrom', '#5D4037', 4, 4, 'adult'),
  ('Preta',  '#111111', 5, 6, 'adult');
