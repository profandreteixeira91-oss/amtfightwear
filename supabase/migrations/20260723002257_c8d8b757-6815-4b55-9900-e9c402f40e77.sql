
-- =========================================
-- Planos de Aula — Fase 1
-- =========================================

-- 1) dojo_lesson_plans
CREATE TABLE public.dojo_lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  unit_id UUID REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.dojo_classes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  belt_id UUID REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  modality TEXT,
  category TEXT,
  age_range TEXT,
  location TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_min INTEGER,
  status TEXT NOT NULL DEFAULT 'planejada',
  color TEXT DEFAULT '#dc2626',
  objectives TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  template_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_lesson_plans TO authenticated;
GRANT ALL ON public.dojo_lesson_plans TO service_role;
ALTER TABLE public.dojo_lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_plans_owner_all" ON public.dojo_lesson_plans
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_lesson_plans_owner_date ON public.dojo_lesson_plans(owner_id, date);
CREATE INDEX idx_lesson_plans_class ON public.dojo_lesson_plans(class_id);
CREATE INDEX idx_lesson_plans_teacher ON public.dojo_lesson_plans(teacher_id);

-- 2) dojo_lesson_content_library
CREATE TABLE public.dojo_lesson_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  modality TEXT,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  pdf_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  avg_time_min INTEGER,
  recommended_belt TEXT,
  recommended_age TEXT,
  technical_level TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_lesson_content_library TO authenticated;
GRANT ALL ON public.dojo_lesson_content_library TO service_role;
ALTER TABLE public.dojo_lesson_content_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_content_owner_all" ON public.dojo_lesson_content_library
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_lesson_content_owner ON public.dojo_lesson_content_library(owner_id);
CREATE INDEX idx_lesson_content_modality ON public.dojo_lesson_content_library(modality);

-- 3) dojo_techniques_bank
CREATE TABLE public.dojo_techniques_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  modality TEXT NOT NULL,
  category TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  difficulty TEXT,
  recommended_belt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_techniques_bank TO authenticated;
GRANT ALL ON public.dojo_techniques_bank TO service_role;
ALTER TABLE public.dojo_techniques_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "techniques_bank_owner_all" ON public.dojo_techniques_bank
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_techniques_owner_modality ON public.dojo_techniques_bank(owner_id, modality);

-- 4) dojo_lesson_history
CREATE TABLE public.dojo_lesson_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  lesson_plan_id UUID REFERENCES public.dojo_lesson_plans(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.dojo_classes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  students_count INTEGER,
  duration_min INTEGER,
  applied_content JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_lesson_history TO authenticated;
GRANT ALL ON public.dojo_lesson_history TO service_role;
ALTER TABLE public.dojo_lesson_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_history_owner_all" ON public.dojo_lesson_history
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_lesson_history_owner_date ON public.dojo_lesson_history(owner_id, date);
CREATE INDEX idx_lesson_history_plan ON public.dojo_lesson_history(lesson_plan_id);

-- Trigger de updated_at (reaproveita função existente public.update_updated_at_column se existir; senão cria)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lesson_plans_updated BEFORE UPDATE ON public.dojo_lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lesson_content_updated BEFORE UPDATE ON public.dojo_lesson_content_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_techniques_updated BEFORE UPDATE ON public.dojo_techniques_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lesson_history_updated BEFORE UPDATE ON public.dojo_lesson_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
