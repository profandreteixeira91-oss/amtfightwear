CREATE TABLE public.dojo_tutorial_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  track_id text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  step integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, track_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_tutorial_progress TO authenticated;
GRANT ALL ON public.dojo_tutorial_progress TO service_role;

ALTER TABLE public.dojo_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tutorial progress" ON public.dojo_tutorial_progress
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER update_dojo_tutorial_progress_updated_at
  BEFORE UPDATE ON public.dojo_tutorial_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();