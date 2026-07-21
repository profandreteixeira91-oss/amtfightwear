-- Função que retorna o ranking de uma turma para o dono dela,
-- ignorando a RLS de dojo_students (a autorização passa a ser
-- "ser dono da turma" — que é o modelo correto para este relatório).
CREATE OR REPLACE FUNCTION public.get_class_ranking(
  _class_id uuid,
  _since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  photo_url text,
  current_belt_id uuid,
  current_degree int,
  status text,
  checkins bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.dojo_classes WHERE id = _class_id;
  IF _owner IS NULL THEN
    RETURN;
  END IF;

  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      s.id AS student_id,
      s.full_name,
      s.photo_url,
      s.current_belt_id,
      s.current_degree,
      s.status,
      COALESCE(a.cnt, 0)::bigint AS checkins
    FROM public.dojo_class_students cs
    JOIN public.dojo_students s ON s.id = cs.student_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::bigint AS cnt
      FROM public.dojo_attendance att
      WHERE att.class_id = _class_id
        AND att.student_id = s.id
        AND att.status = 'present'
        AND (_since IS NULL OR att.checked_in_at >= _since)
    ) a ON TRUE
    WHERE cs.class_id = _class_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_class_ranking(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_ranking(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_ranking(uuid, timestamptz) TO service_role;