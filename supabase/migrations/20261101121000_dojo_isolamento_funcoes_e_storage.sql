-- Isolamento entre academias, parte 2 (auditoria do banco ao vivo em 2026-11-01).
-- Depende de 20261101120500 (policies dojo_* sem bypass de admin).
--
-- 1. Funções SECURITY DEFINER de ranking/medalhas/histórico: sem o atalho do
--    amt_admin e sem brecha para chamada anônima (auth.uid() nulo).
-- 2. dojo_recompute_current_belt / dojo_next_contract_number: executáveis por
--    anônimos e sem checar o dono — agora só para o próprio dono (ou servidor).
-- 3. View dojo_checkin_stats_v: rodava como definer (ignorava a RLS) e era
--    legível por anônimos — passa a respeitar a RLS de dojo_attendance.
-- 4. Avaliações: a "biblioteca" visível a todos é só a global (owner_id nulo);
--    um dono não expõe as dele marcando is_library.
-- 5. Storage: logos/capas (dojo-brand) só o dono grava/apaga na própria pasta;
--    ninguém mais lista os arquivos de fotos de alunos, vídeos, certificados e
--    marcas de outras academias. Os buckets continuam públicos, então os links
--    públicos já gravados (fotos, PDFs, vídeos, logos) seguem funcionando.

-- ---------------------------------------------------------------- 1. rankings
CREATE OR REPLACE FUNCTION public.get_academy_athlete_ranking(_owner uuid, _belt uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, full_name text, photo_url text, belt_id uuid, competitions bigint, wins bigint, losses bigint, gold bigint, silver bigint, bronze bigint, points numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
    AND auth.uid() IS NOT NULL AND auth.uid() = _owner
  ORDER BY 11 DESC, ag.gold DESC, ag.silver DESC, ag.bronze DESC, ag.wins DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_academy_medal_stats(_owner uuid)
 RETURNS TABLE(gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint,
    COUNT(*) FILTER (WHERE medal = 'participation')::bigint,
    COUNT(*)::bigint
  FROM public.dojo_competition_medals
  WHERE owner_id = _owner
    AND auth.uid() IS NOT NULL AND auth.uid() = _owner;
$function$;

CREATE OR REPLACE FUNCTION public.get_academy_medal_summary(_owner uuid)
 RETURNS TABLE(gold bigint, silver bigint, bronze bigint, participation bigint, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE medal = 'gold')::bigint,
    COUNT(*) FILTER (WHERE medal = 'silver')::bigint,
    COUNT(*) FILTER (WHERE medal = 'bronze')::bigint,
    COUNT(*) FILTER (WHERE medal IS NULL OR medal = 'participation')::bigint,
    COUNT(*)::bigint
  FROM public.academy_competition_results
  WHERE owner_id = _owner
    AND auth.uid() IS NOT NULL AND auth.uid() = _owner;
$function$;

CREATE OR REPLACE FUNCTION public.get_class_ranking(_class_id uuid, _since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(student_id uuid, full_name text, photo_url text, current_belt_id uuid, current_degree integer, status text, checkins bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.dojo_classes WHERE id = _class_id;
  IF _owner IS NULL THEN RETURN; END IF;
  IF auth.uid() IS NULL OR _owner <> auth.uid() THEN
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

CREATE OR REPLACE FUNCTION public.get_student_competition_history(_student uuid)
 RETURNS TABLE(athlete_id uuid, academy_competition_id uuid, competition_id uuid, competition_name text, competition_start_at timestamp with time zone, scope text, category text, weight_class text, weight_kg numeric, belt_name text, age_group text, placement integer, medal text, matches integer, wins integer, losses integer, draws integer, submissions integer, knockouts integer, ippons integer, points integer, photos text[], videos text[], certificates text[], notes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
    AND auth.uid() IS NOT NULL
    AND (
      a.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = _student AND s.user_id = auth.uid())
    )
  ORDER BY c.start_at DESC NULLS LAST;
$function$;

-- ------------------------------------------- 2. funções sem checagem de dono
-- Chamada pelo painel (dono) e pelo trigger de graduações; no servidor (service
-- role, cron) auth.uid() é nulo e a chamada segue permitida.
CREATE OR REPLACE FUNCTION public.dojo_recompute_current_belt(_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_belt_id uuid;
  v_degree  int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.dojo_students WHERE id = _student_id AND owner_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  -- Busca a graduação aplicada mais recente (pela data de graduação e depois pela criação)
  SELECT belt_id, COALESCE(degree, 0)
    INTO v_belt_id, v_degree
  FROM public.dojo_graduations
  WHERE student_id = _student_id
    AND applied_at IS NOT NULL
    AND graduation_date <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY graduation_date DESC, created_at DESC
  LIMIT 1;

  -- Se encontrar uma graduação, atualiza. Se NÃO encontrar, não fazemos nada (preservamos o que estiver lá).
  IF v_belt_id IS NOT NULL THEN
    UPDATE public.dojo_students
       SET current_belt_id = v_belt_id,
           current_degree  = v_degree
     WHERE id = _student_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dojo_next_contract_number(_owner uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year TEXT;
  _count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND _owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _count
  FROM (
    SELECT contract_number FROM public.dojo_student_contracts
      WHERE owner_id = _owner AND contract_number LIKE _year || '-%'
    UNION ALL
    SELECT contract_number FROM public.dojo_affiliate_contracts
      WHERE owner_id = _owner AND contract_number LIKE _year || '-%'
  ) x;
  RETURN _year || '-' || lpad(_count::text, 6, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dojo_recompute_current_belt(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dojo_next_contract_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dojo_recompute_current_belt(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dojo_next_contract_number(uuid) TO authenticated, service_role;

-- ------------------------------------------------- 3. view de check-ins
ALTER VIEW public.dojo_checkin_stats_v SET (security_invoker = true);
REVOKE ALL ON public.dojo_checkin_stats_v FROM anon;

-- ------------------------------------------- 4. biblioteca de avaliações
DROP POLICY IF EXISTS "Read own or library evaluations" ON public.dojo_evaluations;
CREATE POLICY "Read own or library evaluations" ON public.dojo_evaluations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (is_library = true AND owner_id IS NULL));

-- ---------------------------------------------------------------- 5. storage
-- dojo-brand: caminhos usados pelo app são logo/<uid>/…, avatars/<uid>/…,
-- <tipo>/<uid>/… e <uid>/<tipo>-…; o dono só mexe onde a pasta 1 ou 2 é ele.
DROP POLICY IF EXISTS "dojo-brand insert" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand update" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand delete" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand read" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand owner insert" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand owner update" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand owner delete" ON storage.objects;
DROP POLICY IF EXISTS "dojo-brand owner read" ON storage.objects;
CREATE POLICY "dojo-brand owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dojo-brand' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[2]));
CREATE POLICY "dojo-brand owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dojo-brand' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[2]))
  WITH CHECK (bucket_id = 'dojo-brand' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[2]));
CREATE POLICY "dojo-brand owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dojo-brand' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[2]));
-- Leitura pela API só da própria pasta (necessária para upload com upsert);
-- o link público do bucket não depende de policy.
CREATE POLICY "dojo-brand owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-brand' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[2]));

DROP POLICY IF EXISTS "dojo-students public read" ON storage.objects;
DROP POLICY IF EXISTS "dojo-students owner read" ON storage.objects;
CREATE POLICY "dojo-students owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-students' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dojo-videos public read" ON storage.objects;
DROP POLICY IF EXISTS "dojo-videos owner read" ON storage.objects;
CREATE POLICY "dojo-videos owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dojo_cert_public_read" ON storage.objects;
DROP POLICY IF EXISTS "dojo_cert_owner_read" ON storage.objects;
CREATE POLICY "dojo_cert_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------- autoverificação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_academy_athlete_ranking','get_academy_medal_stats','get_academy_medal_summary','get_class_ranking','get_student_competition_history')
      AND p.prosrc ILIKE '%amt_admin%'
  ) THEN
    RAISE EXCEPTION 'Funções de ranking ainda aceitam amt_admin — migration desfeita';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ~ '^\(bucket_id = ''dojo-(brand|students|videos|certificates)''::text\)$'
        OR with_check ~ '^\(bucket_id = ''dojo-(brand|students|videos|certificates)''::text\)$')
  ) THEN
    RAISE EXCEPTION 'Ainda há policy aberta em bucket do Dojo — migration desfeita';
  END IF;
END $$;
