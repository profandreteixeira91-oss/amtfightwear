-- =============================================================
-- Multi-student support: allow one login (shared email) to switch
-- between all student records it legitimately owns.
-- =============================================================

-- Helper: is a given student claimable by the current auth user?
CREATE OR REPLACE FUNCTION public.is_my_student(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dojo_students s
    WHERE s.id = _id
      AND (
        s.user_id = auth.uid()
        OR (s.email IS NOT NULL
            AND s.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated;

-- List every student record claimable by the current auth user.
-- SECURITY DEFINER so it bypasses the narrow SELECT policy on dojo_students.
CREATE OR REPLACE FUNCTION public.list_my_students()
RETURNS TABLE (
  id uuid,
  full_name text,
  photo_url text,
  owner_id uuid,
  unit_id uuid,
  current_belt_id uuid,
  current_degree integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.photo_url, s.owner_id, s.unit_id,
         s.current_belt_id, s.current_degree
  FROM public.dojo_students s
  WHERE s.cancelled_at IS NULL
    AND (
      s.user_id = auth.uid()
      OR (s.email IS NOT NULL
          AND s.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
    )
  ORDER BY
    (s.user_id = auth.uid()) DESC NULLS LAST,
    s.full_name ASC;
$$;
GRANT EXECUTE ON FUNCTION public.list_my_students() TO authenticated;

-- Resolve the "active student id" from the request header when the client
-- (student PWA) opted in. Postgrest exposes request headers via the
-- `request.headers` GUC as a JSON object.
CREATE OR REPLACE FUNCTION public.active_student_from_header()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw text;
  wanted uuid;
BEGIN
  BEGIN
    raw := (current_setting('request.headers', true)::json ->> 'x-active-student');
  EXCEPTION WHEN OTHERS THEN
    raw := NULL;
  END;
  IF raw IS NULL OR raw = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    wanted := raw::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  -- Validate it's actually one of the caller's students.
  IF public.is_my_student(wanted) THEN
    RETURN wanted;
  END IF;
  RETURN NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.active_student_from_header() TO authenticated;

-- Rewire get_my_student_id() to honour the header-driven active student
-- before falling back to the "first match" behaviour.
CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.active_student_from_header(),
    (
      SELECT id FROM public.dojo_students
      WHERE user_id = auth.uid()
         OR (email IS NOT NULL
             AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      ORDER BY (user_id = auth.uid()) DESC NULLS LAST
      LIMIT 1
    )
  );
$$;