CREATE TABLE public.dojo_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_push_subscriptions TO authenticated;
GRANT ALL ON public.dojo_push_subscriptions TO service_role;

ALTER TABLE public.dojo_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia suas próprias inscrições push"
  ON public.dojo_push_subscriptions FOR ALL TO authenticated
  USING (student_id = public.get_my_student_id())
  WITH CHECK (student_id = public.get_my_student_id());

CREATE POLICY "Dono da academia visualiza inscrições dos alunos"
  ON public.dojo_push_subscriptions FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER dojo_push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.dojo_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_dojo_push_subs_student ON public.dojo_push_subscriptions(student_id);