
-- 1) Backfill: define a faixa atual de cada aluno a partir da graduação
--    com a MAIOR data de graduação (empate: created_at mais recente).
WITH latest AS (
  SELECT DISTINCT ON (student_id)
    student_id, belt_id, degree, graduation_date
  FROM public.dojo_graduations
  ORDER BY student_id, graduation_date DESC, created_at DESC
)
UPDATE public.dojo_students s
SET current_belt_id = l.belt_id,
    current_degree  = COALESCE(l.degree, 0)
FROM latest l
WHERE s.id = l.student_id
  AND (
    s.current_belt_id IS DISTINCT FROM l.belt_id
    OR COALESCE(s.current_degree, 0) IS DISTINCT FROM COALESCE(l.degree, 0)
  );

-- 2) Trigger: recalcula a faixa atual sempre que houver INSERT/UPDATE/DELETE
--    em dojo_graduations. A lógica é baseada em graduation_date, não em
--    created_at, garantindo que datas retroativas nunca substituam a atual.
CREATE OR REPLACE FUNCTION public.dojo_recompute_current_belt(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_belt_id uuid;
  v_degree  int;
BEGIN
  SELECT belt_id, COALESCE(degree, 0)
    INTO v_belt_id, v_degree
  FROM public.dojo_graduations
  WHERE student_id = _student_id
  ORDER BY graduation_date DESC, created_at DESC
  LIMIT 1;

  UPDATE public.dojo_students
     SET current_belt_id = v_belt_id,
         current_degree  = COALESCE(v_degree, 0)
   WHERE id = _student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dojo_graduations_sync_current_belt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.dojo_recompute_current_belt(OLD.student_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.dojo_recompute_current_belt(NEW.student_id);
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      PERFORM public.dojo_recompute_current_belt(OLD.student_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.dojo_recompute_current_belt(NEW.student_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_dojo_graduations_sync_current_belt ON public.dojo_graduations;
CREATE TRIGGER trg_dojo_graduations_sync_current_belt
AFTER INSERT OR UPDATE OR DELETE ON public.dojo_graduations
FOR EACH ROW EXECUTE FUNCTION public.dojo_graduations_sync_current_belt();
