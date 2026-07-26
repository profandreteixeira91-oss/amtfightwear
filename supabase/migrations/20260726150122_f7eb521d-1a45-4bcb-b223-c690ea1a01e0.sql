
-- 1) Policies: trocar bypass 'admin' -> 'amt_admin'
DROP POLICY IF EXISTS "Owner manages athlete goals" ON public.dojo_athlete_goals;
CREATE POLICY "Owner manages athlete goals" ON public.dojo_athlete_goals
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role));

DROP POLICY IF EXISTS "Owner manages own student technical scores" ON public.dojo_student_technical_scores;
CREATE POLICY "Owner manages own student technical scores" ON public.dojo_student_technical_scores
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role));

DROP POLICY IF EXISTS "Owner manages own fundamentals" ON public.dojo_technical_fundamentals;
CREATE POLICY "Owner manages own fundamentals" ON public.dojo_technical_fundamentals
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'amt_admin'::app_role));

-- 2) Funções: mesmo ajuste
CREATE OR REPLACE FUNCTION public.get_class_ranking(_class_id uuid, _since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(student_id uuid, full_name text, photo_url text, current_belt_id uuid, current_degree integer, status text, checkins bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.dojo_classes WHERE id = _class_id;
  IF _owner IS NULL THEN RETURN; END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'amt_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.id, s.full_name, s.photo_url, s.current_belt_id, s.current_degree, s.status,
      COALESCE(a.cnt, 0)::bigint
    FROM public.dojo_class_students cs
    JOIN public.dojo_students s ON s.id = cs.student_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::bigint AS cnt FROM public.dojo_attendance att
      WHERE att.class_id = _class_id AND att.student_id = s.id AND att.status = 'present'
        AND (_since IS NULL OR att.checked_in_at >= _since)
    ) a ON TRUE
    WHERE cs.class_id = _class_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_academy_medal_stats(_owner uuid)
 RETURNS TABLE(gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint,
    COUNT(*) FILTER (WHERE medal = 'participation')::bigint,
    COUNT(*)::bigint
  FROM public.dojo_competition_medals
  WHERE owner_id = _owner
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'amt_admin'::app_role));
$function$;

CREATE OR REPLACE FUNCTION public.get_academy_medal_summary(_owner uuid)
 RETURNS TABLE(gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint,
    COUNT(*) FILTER (WHERE medal IS NULL OR medal = 'participation')::bigint,
    COUNT(*)::bigint
  FROM public.academy_competition_results
  WHERE owner_id = _owner
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'amt_admin'::app_role));
$function$;

CREATE OR REPLACE FUNCTION public.get_academy_athlete_ranking(_owner uuid, _belt uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, full_name text, photo_url text, belt_id uuid, competitions bigint, wins bigint, losses bigint, gold bigint, silver bigint, bronze bigint, points numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH agg AS (
    SELECT a.student_id,
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
  SELECT s.id, s.full_name, s.photo_url, s.current_belt_id,
    ag.competitions, ag.wins, ag.losses, ag.gold, ag.silver, ag.bronze,
    (ag.gold*5 + ag.silver*3 + ag.bronze*2 + ag.wins*1)::numeric
  FROM agg ag JOIN public.dojo_students s ON s.id = ag.student_id
  WHERE (_belt IS NULL OR s.current_belt_id = _belt)
    AND (auth.uid() = _owner OR public.has_role(auth.uid(),'amt_admin'::app_role))
  ORDER BY 11 DESC, ag.gold DESC, ag.silver DESC, ag.bronze DESC, ag.wins DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_competition_history(_student uuid)
 RETURNS TABLE(athlete_id uuid, academy_competition_id uuid, competition_id uuid, competition_name text, competition_start_at timestamp with time zone, scope text, category text, weight_class text, weight_kg numeric, belt_name text, age_group text, placement integer, medal text, matches integer, wins integer, losses integer, draws integer, submissions integer, knockouts integer, ippons integer, points integer, photos text[], videos text[], certificates text[], notes text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.id, ac.id, c.id, c.name, c.start_at, c.scope,
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
      OR public.has_role(auth.uid(), 'amt_admin'::app_role)
    )
  ORDER BY c.start_at DESC NULLS LAST;
$function$;
