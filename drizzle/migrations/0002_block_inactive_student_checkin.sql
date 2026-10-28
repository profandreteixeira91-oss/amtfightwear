CREATE OR REPLACE FUNCTION public.dojo_attendance_block_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO _status FROM public.dojo_students WHERE id = NEW.student_id;
  IF _status = 'inactive' THEN
    RAISE EXCEPTION 'Aluno inativo não pode fazer check-in. Reative o cadastro do aluno para liberar.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dojo_attendance_block_inactive ON public.dojo_attendance;
CREATE TRIGGER trg_dojo_attendance_block_inactive
BEFORE INSERT OR UPDATE OF student_id ON public.dojo_attendance
FOR EACH ROW EXECUTE FUNCTION public.dojo_attendance_block_inactive();