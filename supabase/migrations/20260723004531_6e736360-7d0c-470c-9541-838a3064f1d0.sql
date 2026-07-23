
CREATE TABLE public.dojo_lesson_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  modality TEXT,
  category TEXT,
  age_range TEXT,
  color TEXT,
  objectives TEXT,
  duration_min INTEGER,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_lesson_templates TO authenticated;
GRANT ALL ON public.dojo_lesson_templates TO service_role;

ALTER TABLE public.dojo_lesson_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own templates"
  ON public.dojo_lesson_templates
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_dojo_lesson_templates_updated_at
  BEFORE UPDATE ON public.dojo_lesson_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dojo_lesson_templates_owner ON public.dojo_lesson_templates(owner_id);
