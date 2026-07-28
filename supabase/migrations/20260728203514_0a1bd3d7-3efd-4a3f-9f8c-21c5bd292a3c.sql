
-- Allow one push subscription per (endpoint, student), so a shared device
-- delivers pushes to every student the login owns, not only the selected one.
ALTER TABLE public.dojo_push_subscriptions
  DROP CONSTRAINT IF EXISTS dojo_push_subscriptions_endpoint_key;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dojo_push_subscriptions_endpoint_student_key'
  ) THEN
    ALTER TABLE public.dojo_push_subscriptions
      ADD CONSTRAINT dojo_push_subscriptions_endpoint_student_key
      UNIQUE (endpoint, student_id);
  END IF;
END $$;

-- Broaden RLS: the current auth user may manage push rows for any student
-- claimable via is_my_student() (i.e. every profile in their switcher).
DROP POLICY IF EXISTS "Aluno gerencia suas próprias inscrições push"
  ON public.dojo_push_subscriptions;

CREATE POLICY "Aluno gerencia inscrições de qualquer aluno que possui"
  ON public.dojo_push_subscriptions FOR ALL TO authenticated
  USING (public.is_my_student(student_id))
  WITH CHECK (public.is_my_student(student_id));
