CREATE OR REPLACE FUNCTION public.dojo_attendance_block_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _status text;
BEGIN
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO _status FROM public.dojo_students WHERE id = NEW.student_id FOR SHARE;
  IF _status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Apenas alunos ativos podem fazer check-in. Reative o cadastro do aluno para liberar.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.is_my_student(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = _id AND s.cancelled_at IS NULL AND s.status IS DISTINCT FROM 'frozen' AND (s.user_id = auth.uid() OR (s.email IS NOT NULL AND s.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))));
$$;
CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE raw text;
BEGIN
  BEGIN raw := current_setting('request.headers', true)::json ->> 'x-active-student'; EXCEPTION WHEN OTHERS THEN raw := NULL; END;
  IF raw IS NOT NULL AND raw <> '' THEN RETURN public.active_student_from_header(); END IF;
  RETURN (SELECT id FROM public.dojo_students WHERE cancelled_at IS NULL AND status IS DISTINCT FROM 'frozen' AND (user_id = auth.uid() OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))) ORDER BY (user_id = auth.uid()) DESC NULLS LAST LIMIT 1);
END $$;
CREATE OR REPLACE FUNCTION public.list_my_students()
RETURNS TABLE(id uuid, full_name text, photo_url text, owner_id uuid, unit_id uuid, current_belt_id uuid, current_degree integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT s.id,s.full_name,s.photo_url,s.owner_id,s.unit_id,s.current_belt_id,s.current_degree FROM public.dojo_students s WHERE public.is_my_student(s.id) ORDER BY (s.user_id = auth.uid()) DESC NULLS LAST,s.full_name ASC;
$$;
ALTER POLICY "Students read own students" ON public.dojo_students USING (user_id = auth.uid() AND status IS DISTINCT FROM 'frozen');
ALTER POLICY "Student reads own goals" ON public.dojo_athlete_goals USING (student_id = public.get_my_student_id() OR public.is_my_student(student_id));