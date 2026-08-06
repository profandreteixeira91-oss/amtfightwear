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

GRANT EXECUTE ON FUNCTION public.dojo_recompute_current_belt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dojo_recompute_current_belt(uuid) TO service_role;