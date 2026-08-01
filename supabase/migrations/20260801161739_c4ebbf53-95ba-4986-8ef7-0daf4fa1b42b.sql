-- 1) Novos campos na fila
ALTER TABLE public.store_production_jobs
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'recebido',
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS stage_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stage_assignees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS material_alert text,
  ADD COLUMN IF NOT EXISTS rework_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS store_production_jobs_stage_idx ON public.store_production_jobs (stage);
CREATE INDEX IF NOT EXISTS store_production_jobs_deadline_idx ON public.store_production_jobs (deadline);

-- 2) Eventos de etapa (linha do tempo + cronômetro)
CREATE TABLE IF NOT EXISTS public.store_production_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.store_production_jobs(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  assignee text,
  note text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_production_stage_events TO authenticated;
GRANT ALL ON public.store_production_stage_events TO service_role;
ALTER TABLE public.store_production_stage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team can manage production stage events" ON public.store_production_stage_events;
CREATE POLICY "Team can manage production stage events"
  ON public.store_production_stage_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS store_production_stage_events_job_idx
  ON public.store_production_stage_events (job_id, entered_at DESC);

-- 3) Observações internas
CREATE TABLE IF NOT EXISTS public.store_production_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.store_production_jobs(id) ON DELETE CASCADE,
  author text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_production_comments TO authenticated;
GRANT ALL ON public.store_production_comments TO service_role;
ALTER TABLE public.store_production_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team can manage production comments" ON public.store_production_comments;
CREATE POLICY "Team can manage production comments"
  ON public.store_production_comments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS store_production_comments_job_idx
  ON public.store_production_comments (job_id, created_at DESC);

-- 4) Gatilho de cronômetro / linha do tempo
CREATE OR REPLACE FUNCTION public.store_production_track_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.store_production_stage_events (job_id, from_stage, to_stage, assignee, entered_at)
    VALUES (NEW.id, NULL, NEW.stage, NEW.assignee, COALESCE(NEW.stage_started_at, now()));
    RETURN NEW;
  END IF;

  NEW.updated_at := now();

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_started_at := now();

    UPDATE public.store_production_stage_events e
       SET exited_at = now(),
           duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - e.entered_at))::int)
     WHERE e.job_id = NEW.id AND e.exited_at IS NULL;

    INSERT INTO public.store_production_stage_events (job_id, from_stage, to_stage, assignee, entered_at)
    VALUES (NEW.id, OLD.stage, NEW.stage, NEW.assignee, now());

    IF NEW.stage = 'finalizado' THEN
      NEW.status := 'done';
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSIF NEW.stage = 'recebido' THEN
      NEW.status := 'queued';
      NEW.completed_at := NULL;
    ELSE
      IF NEW.status IN ('queued', 'done') THEN
        NEW.status := 'in_production';
      END IF;
      NEW.started_at := COALESCE(NEW.started_at, now());
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_production_track_stage_ins ON public.store_production_jobs;
CREATE TRIGGER store_production_track_stage_ins
  AFTER INSERT ON public.store_production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.store_production_track_stage();

DROP TRIGGER IF EXISTS store_production_track_stage_upd ON public.store_production_jobs;
CREATE TRIGGER store_production_track_stage_upd
  BEFORE UPDATE ON public.store_production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.store_production_track_stage();

-- 5) Realtime
ALTER TABLE public.store_production_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.store_production_stage_events REPLICA IDENTITY FULL;
ALTER TABLE public.store_production_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_production_jobs;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_production_stage_events;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_production_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;