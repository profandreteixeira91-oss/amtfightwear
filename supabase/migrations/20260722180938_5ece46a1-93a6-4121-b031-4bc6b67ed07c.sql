
CREATE TABLE public.dojo_athlete_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'custom',
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  target_belt_id UUID,
  target_degree INTEGER,
  auto_progress BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dojo_athlete_goals_type_chk CHECK (goal_type IN ('attendance','graduation','competition','evaluation','custom')),
  CONSTRAINT dojo_athlete_goals_status_chk CHECK (status IN ('active','completed','paused','cancelled')),
  CONSTRAINT dojo_athlete_goals_priority_chk CHECK (priority IN ('low','medium','high'))
);

CREATE INDEX idx_dojo_athlete_goals_student ON public.dojo_athlete_goals(student_id);
CREATE INDEX idx_dojo_athlete_goals_owner ON public.dojo_athlete_goals(owner_id);
CREATE INDEX idx_dojo_athlete_goals_status ON public.dojo_athlete_goals(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_athlete_goals TO authenticated;
GRANT ALL ON public.dojo_athlete_goals TO service_role;

ALTER TABLE public.dojo_athlete_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages athlete goals"
  ON public.dojo_athlete_goals FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Student reads own goals"
  ON public.dojo_athlete_goals FOR SELECT
  TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

CREATE TRIGGER trg_dojo_athlete_goals_updated_at
  BEFORE UPDATE ON public.dojo_athlete_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
