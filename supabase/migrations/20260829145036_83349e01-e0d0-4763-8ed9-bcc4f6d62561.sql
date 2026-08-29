CREATE OR REPLACE FUNCTION public.dojo_my_staff_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.dojo_team_members WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Team member reads own dojo branding"
ON public.dojo_academy_profile
FOR SELECT
TO authenticated
USING (owner_id = public.dojo_my_staff_owner_id());