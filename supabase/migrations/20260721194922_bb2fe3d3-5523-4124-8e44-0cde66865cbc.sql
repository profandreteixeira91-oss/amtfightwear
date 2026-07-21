
-- ============================================================
-- FASE 1: Expansão do schema de Competições
-- ============================================================

-- 1) dojo_competitions: novos campos
ALTER TABLE public.dojo_competitions
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS regulation_url text,
  ADD COLUMN IF NOT EXISTS schedule_url text,
  ADD COLUMN IF NOT EXISTS venue_map_url text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS estimated_athletes integer,
  ADD COLUMN IF NOT EXISTS is_international boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS federation text,
  ADD COLUMN IF NOT EXISTS confederation text,
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calendar_event_id uuid;

-- Backfill is_international a partir do country
UPDATE public.dojo_competitions
  SET is_international = (country IS NOT NULL AND upper(country) <> 'BR')
  WHERE is_international = false;

CREATE INDEX IF NOT EXISTS idx_dojo_competitions_modality ON public.dojo_competitions(modality);
CREATE INDEX IF NOT EXISTS idx_dojo_competitions_country ON public.dojo_competitions(country);

-- 2) dojo_competition_athletes: novos campos
ALTER TABLE public.dojo_competition_athletes
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) dojo_competition_results: novos campos
ALTER TABLE public.dojo_competition_results
  ADD COLUMN IF NOT EXISTS matches_total integer,
  ADD COLUMN IF NOT EXISTS matches_drawn integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submissions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knockouts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ippons integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points integer,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer;

-- 4) Nova tabela: dojo_competition_media (fotos/vídeos/certificados)
CREATE TABLE IF NOT EXISTS public.dojo_competition_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.dojo_competition_athletes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video','certificate')),
  url text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_competition_media_owner ON public.dojo_competition_media(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_competition_media_comp ON public.dojo_competition_media(competition_id);
CREATE INDEX IF NOT EXISTS idx_dojo_competition_media_athlete ON public.dojo_competition_media(athlete_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_media TO authenticated;
GRANT ALL ON public.dojo_competition_media TO service_role;
ALTER TABLE public.dojo_competition_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages comp media"
  ON public.dojo_competition_media
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 5) Nova tabela: dojo_competition_calendar
CREATE TABLE IF NOT EXISTS public.dojo_competition_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  event_starts_at timestamptz NOT NULL,
  event_ends_at timestamptz,
  notify_teachers boolean NOT NULL DEFAULT true,
  notify_athletes boolean NOT NULL DEFAULT true,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_dojo_comp_calendar_owner ON public.dojo_competition_calendar(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_comp_calendar_comp ON public.dojo_competition_calendar(competition_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_calendar TO authenticated;
GRANT ALL ON public.dojo_competition_calendar TO service_role;
ALTER TABLE public.dojo_competition_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages comp calendar"
  ON public.dojo_competition_calendar
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_dojo_comp_calendar_updated
  BEFORE UPDATE ON public.dojo_competition_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) RPC: histórico competitivo do aluno
CREATE OR REPLACE FUNCTION public.get_student_competition_history(_student uuid)
RETURNS TABLE (
  athlete_id uuid,
  competition_id uuid,
  competition_name text,
  competition_starts_at timestamptz,
  modality text,
  category text,
  weight numeric,
  belt text,
  placement integer,
  matches_won integer,
  matches_lost integer,
  matches_drawn integer,
  submissions integer,
  knockouts integer,
  ippons integer,
  total_points integer,
  medal text,
  notes text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id AS athlete_id,
    c.id AS competition_id,
    c.name AS competition_name,
    c.starts_at AS competition_starts_at,
    c.modality,
    a.category,
    a.weight,
    a.belt,
    r.placement,
    r.matches_won,
    r.matches_lost,
    r.matches_drawn,
    r.submissions,
    r.knockouts,
    r.ippons,
    r.total_points,
    m.medal,
    r.notes
  FROM public.dojo_competition_athletes a
  JOIN public.dojo_competitions c ON c.id = a.competition_id
  LEFT JOIN public.dojo_competition_results r ON r.athlete_id = a.id
  LEFT JOIN public.dojo_competition_medals m ON m.athlete_id = a.id
  WHERE a.student_id = _student
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.dojo_students s
         WHERE s.id = _student AND s.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  ORDER BY c.starts_at DESC NULLS LAST;
$$;

-- 7) RPC: estatísticas de medalhas por dojo
CREATE OR REPLACE FUNCTION public.get_academy_medal_stats(_owner uuid)
RETURNS TABLE (gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint AS gold,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint AS silver,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint AS bronze,
    COUNT(*) FILTER (WHERE medal = 'participation')::bigint AS participation,
    COUNT(*)::bigint AS total
  FROM public.dojo_competition_medals
  WHERE owner_id = _owner
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'admin'::app_role));
$$;
