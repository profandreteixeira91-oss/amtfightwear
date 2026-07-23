
CREATE TABLE public.dojo_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_contract_templates_owner ON public.dojo_contract_templates(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_contract_templates TO authenticated;
GRANT ALL ON public.dojo_contract_templates TO service_role;
ALTER TABLE public.dojo_contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own contract templates"
  ON public.dojo_contract_templates FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_dojo_contract_templates_updated
  BEFORE UPDATE ON public.dojo_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dojo_student_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.dojo_contract_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_student_contracts_owner ON public.dojo_student_contracts(owner_id);
CREATE INDEX idx_dojo_student_contracts_student ON public.dojo_student_contracts(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_contracts TO authenticated;
GRANT ALL ON public.dojo_student_contracts TO service_role;
ALTER TABLE public.dojo_student_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own student contracts"
  ON public.dojo_student_contracts FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Student views own contracts"
  ON public.dojo_student_contracts FOR SELECT
  USING (student_id = public.get_my_student_id());
CREATE TRIGGER trg_dojo_student_contracts_updated
  BEFORE UPDATE ON public.dojo_student_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
