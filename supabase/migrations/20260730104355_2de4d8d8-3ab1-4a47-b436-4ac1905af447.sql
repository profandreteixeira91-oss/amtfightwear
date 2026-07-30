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
  SELECT belt_id, COALESCE(degree, 0)
    INTO v_belt_id, v_degree
  FROM public.dojo_graduations
  WHERE student_id = _student_id
    AND applied_at IS NOT NULL
    AND graduation_date <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY graduation_date DESC, created_at DESC
  LIMIT 1;

  IF v_belt_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.dojo_students
     SET current_belt_id = v_belt_id,
         current_degree  = COALESCE(v_degree, 0)
   WHERE id = _student_id;
END;
$function$;