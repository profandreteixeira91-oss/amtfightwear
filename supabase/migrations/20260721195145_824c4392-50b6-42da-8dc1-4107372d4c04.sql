
ALTER TABLE public.academy_competition_athletes
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.academy_competition_results
  ADD COLUMN IF NOT EXISTS draws integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knockouts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ippons integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer,
  ADD COLUMN IF NOT EXISTS certificates text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_academy_comp_results_student ON public.academy_competition_results(student_id);
CREATE INDEX IF NOT EXISTS idx_academy_comp_athletes_student ON public.academy_competition_athletes(student_id);

DROP FUNCTION IF EXISTS public.get_student_competition_history(uuid);
CREATE OR REPLACE FUNCTION public.get_student_competition_history(_student uuid)
RETURNS TABLE (
  athlete_id uuid,
  academy_competition_id uuid,
  competition_id uuid,
  competition_name text,
  competition_start_at timestamptz,
  scope text,
  category text,
  weight_class text,
  weight_kg numeric,
  belt_name text,
  age_group text,
  placement integer,
  medal text,
  matches integer,
  wins integer,
  losses integer,
  draws integer,
  submissions integer,
  knockouts integer,
  ippons integer,
  points integer,
  photos text[],
  videos text[],
  certificates text[],
  notes text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id, ac.id, c.id, c.name, c.start_at, c.scope,
    a.category, a.weight_class, a.weight_kg, a.belt_name, a.age_group,
    r.placement, r.medal, r.matches, r.wins, r.losses, r.draws, r.submissions,
    r.knockouts, r.ippons, r.points, r.photos, r.videos, r.certificates, r.notes
  FROM public.academy_competition_athletes a
  JOIN public.academy_competitions ac ON ac.id = a.academy_competition_id
  JOIN public.competitions c ON c.id = ac.competition_id
  LEFT JOIN public.academy_competition_results r ON r.athlete_id = a.id
  WHERE a.student_id = _student
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = _student AND s.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  ORDER BY c.start_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_academy_medal_summary(_owner uuid)
RETURNS TABLE (gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint,
    COUNT(*) FILTER (WHERE medal IS NULL OR medal = 'participation')::bigint,
    COUNT(*)::bigint
  FROM public.academy_competition_results
  WHERE owner_id = _owner
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'admin'::app_role));
$$;

CREATE OR REPLACE FUNCTION public.get_academy_athlete_ranking(_owner uuid, _belt uuid DEFAULT NULL)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  photo_url text,
  belt_id uuid,
  competitions bigint,
  wins bigint,
  losses bigint,
  gold bigint,
  silver bigint,
  bronze bigint,
  points numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      a.student_id,
      COUNT(DISTINCT a.academy_competition_id) AS competitions,
      COALESCE(SUM(r.wins),0)::bigint AS wins,
      COALESCE(SUM(r.losses),0)::bigint AS losses,
      COUNT(*) FILTER (WHERE r.medal = 'gold')::bigint AS gold,
      COUNT(*) FILTER (WHERE r.medal = 'silver')::bigint AS silver,
      COUNT(*) FILTER (WHERE r.medal = 'bronze')::bigint AS bronze
    FROM public.academy_competition_athletes a
    LEFT JOIN public.academy_competition_results r ON r.athlete_id = a.id
    WHERE a.owner_id = _owner
    GROUP BY a.student_id
  )
  SELECT
    s.id, s.full_name, s.photo_url, s.current_belt_id,
    ag.competitions, ag.wins, ag.losses, ag.gold, ag.silver, ag.bronze,
    (ag.gold*5 + ag.silver*3 + ag.bronze*2 + ag.wins*1)::numeric AS points
  FROM agg ag
  JOIN public.dojo_students s ON s.id = ag.student_id
  WHERE (_belt IS NULL OR s.current_belt_id = _belt)
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'admin'::app_role))
  ORDER BY points DESC, ag.gold DESC, ag.silver DESC, ag.bronze DESC, ag.wins DESC;
$$;
