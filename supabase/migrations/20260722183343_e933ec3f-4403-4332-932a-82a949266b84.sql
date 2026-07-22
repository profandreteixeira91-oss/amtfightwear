
-- 1) Fundamentos técnicos por modalidade
CREATE TABLE public.dojo_technical_fundamentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modality TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_tech_fund_owner_mod ON public.dojo_technical_fundamentals(owner_id, modality);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_technical_fundamentals TO authenticated;
GRANT ALL ON public.dojo_technical_fundamentals TO service_role;

ALTER TABLE public.dojo_technical_fundamentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own fundamentals"
  ON public.dojo_technical_fundamentals
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_dojo_tech_fund_updated
  BEFORE UPDATE ON public.dojo_technical_fundamentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Notas técnicas dos alunos
CREATE TABLE public.dojo_student_technical_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  fundamental_id UUID NOT NULL REFERENCES public.dojo_technical_fundamentals(id) ON DELETE CASCADE,
  score NUMERIC(4,1) NOT NULL DEFAULT 0,
  notes TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, fundamental_id)
);
CREATE INDEX idx_dojo_tech_scores_student ON public.dojo_student_technical_scores(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_technical_scores TO authenticated;
GRANT ALL ON public.dojo_student_technical_scores TO service_role;

ALTER TABLE public.dojo_student_technical_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own student technical scores"
  ON public.dojo_student_technical_scores
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Student can view own technical scores"
  ON public.dojo_student_technical_scores
  FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE TRIGGER trg_dojo_tech_scores_updated
  BEFORE UPDATE ON public.dojo_student_technical_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
