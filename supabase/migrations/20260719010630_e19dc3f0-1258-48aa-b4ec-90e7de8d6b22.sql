
CREATE OR REPLACE FUNCTION public.ensure_my_student_credentials()
RETURNS TABLE(checkin_pin text, qr_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  cur_pin text;
  cur_qr  text;
  new_pin text;
  new_qr  text;
BEGIN
  sid := public.get_my_student_id();
  IF sid IS NULL THEN
    RETURN;
  END IF;

  SELECT s.checkin_pin, s.qr_token INTO cur_pin, cur_qr
  FROM public.dojo_students s WHERE s.id = sid;

  IF cur_pin IS NULL THEN
    LOOP
      new_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.dojo_students WHERE dojo_students.checkin_pin = new_pin);
    END LOOP;
    cur_pin := new_pin;
  END IF;

  IF cur_qr IS NULL THEN
    new_qr := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    cur_qr := new_qr;
  END IF;

  UPDATE public.dojo_students
     SET checkin_pin = cur_pin, qr_token = cur_qr, updated_at = now()
   WHERE id = sid;

  checkin_pin := cur_pin;
  qr_token := cur_qr;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_student_credentials() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_my_student_credentials() TO authenticated;
