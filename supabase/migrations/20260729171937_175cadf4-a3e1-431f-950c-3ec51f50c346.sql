
CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    public.active_student_from_header(),
    (
      SELECT id FROM public.dojo_students
      WHERE cancelled_at IS NULL
        AND (
          user_id = auth.uid()
          OR (email IS NOT NULL
              AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
      ORDER BY (user_id = auth.uid()) DESC NULLS LAST
      LIMIT 1
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_my_student(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.dojo_students s
    WHERE s.id = _id
      AND s.cancelled_at IS NULL
      AND (
        s.user_id = auth.uid()
        OR (s.email IS NOT NULL
            AND s.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
      )
  );
$function$;
