
CREATE TABLE public.dojo_graduation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  system TEXT NOT NULL DEFAULT 'merit' CHECK (system IN ('merit','classes','period')),
  classes_by_belt JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_months_by_belt JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_classes INTEGER NOT NULL DEFAULT 60,
  default_period_months INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_graduation_settings TO authenticated;
GRANT ALL ON public.dojo_graduation_settings TO service_role;
ALTER TABLE public.dojo_graduation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages grad settings" ON public.dojo_graduation_settings
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_updated_at_dojo_grad_settings BEFORE UPDATE ON public.dojo_graduation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dojo_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  belt_id UUID REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  degree INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score NUMERIC NOT NULL DEFAULT 0,
  passing_score NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_evaluations TO authenticated;
GRANT ALL ON public.dojo_evaluations TO service_role;
ALTER TABLE public.dojo_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages evaluations" ON public.dojo_evaluations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_dojo_eval_owner ON public.dojo_evaluations(owner_id);
CREATE INDEX idx_dojo_eval_belt ON public.dojo_evaluations(belt_id);
CREATE TRIGGER set_updated_at_dojo_eval BEFORE UPDATE ON public.dojo_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
