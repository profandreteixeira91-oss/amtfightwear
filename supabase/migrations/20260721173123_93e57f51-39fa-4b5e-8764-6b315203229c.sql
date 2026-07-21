-- Grant amt_admin to the AMT owner
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'amt_admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('profandreteixeira91@gmail.com','amy.borm@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Rewrite dojo_belts policies
DROP POLICY IF EXISTS "Owner manages dojo_belts" ON public.dojo_belts;
DROP POLICY IF EXISTS "admins manage belts" ON public.dojo_belts;
DROP POLICY IF EXISTS "Student reads belts of own owner" ON public.dojo_belts;

-- Anyone signed in can read: global (owner_id NULL) or their own; students see owner's
CREATE POLICY "read_belts_scoped" ON public.dojo_belts FOR SELECT TO authenticated
USING (
  owner_id IS NULL
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'amt_admin')
  OR owner_id = public.get_my_student_owner_id()
);

-- Only AMT admin can write global (owner_id NULL) rows
CREATE POLICY "amt_admin_manages_global_belts" ON public.dojo_belts FOR ALL TO authenticated
USING (owner_id IS NULL AND public.has_role(auth.uid(), 'amt_admin'))
WITH CHECK (owner_id IS NULL AND public.has_role(auth.uid(), 'amt_admin'));

-- Owners manage their own belts
CREATE POLICY "owner_manages_own_belts" ON public.dojo_belts FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
