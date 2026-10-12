CREATE TABLE public.dojo_setup_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 4),
  status text NOT NULL DEFAULT 'paused' CHECK (status IN ('paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_setup_progress TO authenticated;
GRANT ALL ON public.dojo_setup_progress TO service_role;
ALTER TABLE public.dojo_setup_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dojo owner manages setup progress" ON public.dojo_setup_progress
FOR ALL TO authenticated
USING (owner_id = auth.uid() AND (
  EXISTS (SELECT 1 FROM public.dojo_users u WHERE u.auth_user_id = auth.uid() AND u.owner_id = auth.uid() AND u.role = 'owner' AND u.status = 'active')
  OR EXISTS (SELECT 1 FROM public.dojo_subscriptions s WHERE s.owner_id = auth.uid())
) AND NOT EXISTS (SELECT 1 FROM public.student_accounts a WHERE a.auth_user_id = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.dojo_staff_accounts a WHERE a.auth_user_id = auth.uid()))
WITH CHECK (owner_id = auth.uid() AND (
  EXISTS (SELECT 1 FROM public.dojo_users u WHERE u.auth_user_id = auth.uid() AND u.owner_id = auth.uid() AND u.role = 'owner' AND u.status = 'active')
  OR EXISTS (SELECT 1 FROM public.dojo_subscriptions s WHERE s.owner_id = auth.uid())
) AND NOT EXISTS (SELECT 1 FROM public.student_accounts a WHERE a.auth_user_id = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.dojo_staff_accounts a WHERE a.auth_user_id = auth.uid()));
COMMENT ON TABLE public.dojo_setup_progress IS 'Non-blocking owner setup progress, independent of AMT Pay onboarding. No academy data is seeded.';