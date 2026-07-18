
-- ============================================================
-- App do Aluno — Fase 1
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.dojo_students
  WHERE user_id = auth.uid()
     OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ORDER BY (user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_student_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_student_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.dojo_students WHERE id = public.get_my_student_id();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_student_owner_id() TO authenticated;

-- ============================================================
-- Notificações do aluno
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dojo_student_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dojo_student_notif_student_idx ON public.dojo_student_notifications(student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_notifications TO authenticated;
GRANT ALL ON public.dojo_student_notifications TO service_role;
ALTER TABLE public.dojo_student_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage student notifications"
  ON public.dojo_student_notifications FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Students read own notifications"
  ON public.dojo_student_notifications FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE POLICY "Students mark own notifications read"
  ON public.dojo_student_notifications FOR UPDATE TO authenticated
  USING (student_id = public.get_my_student_id())
  WITH CHECK (student_id = public.get_my_student_id());

-- Cadastro
CREATE POLICY "Student can read own record"
  ON public.dojo_students FOR SELECT TO authenticated
  USING (id = public.get_my_student_id());

CREATE POLICY "Student can update own record"
  ON public.dojo_students FOR UPDATE TO authenticated
  USING (id = public.get_my_student_id())
  WITH CHECK (id = public.get_my_student_id());

-- Aulas
CREATE POLICY "Student reads own class enrollments"
  ON public.dojo_class_students FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE POLICY "Student reads classes of own owner"
  ON public.dojo_classes FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads schedules of own owner"
  ON public.dojo_class_schedules FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads occurrences of own owner"
  ON public.dojo_class_occurrences FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads spaces of own owner"
  ON public.dojo_spaces FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads units of own owner"
  ON public.dojo_units FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

-- Presenças
CREATE POLICY "Student reads own attendance"
  ON public.dojo_attendance FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE POLICY "Student self check-in"
  ON public.dojo_attendance FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.get_my_student_id()
    AND owner_id = public.get_my_student_owner_id()
    AND method IN ('app','qr','pin','self')
  );

-- Faixas
CREATE POLICY "Student reads belts of own owner"
  ON public.dojo_belts FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads own graduations"
  ON public.dojo_graduations FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

-- Certificados
CREATE POLICY "Student reads own certificates"
  ON public.dojo_certificates FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

-- Financeiro
CREATE POLICY "Student reads own invoices"
  ON public.dojo_invoices FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE POLICY "Student reads own enrollments"
  ON public.dojo_enrollments FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

-- Competições
CREATE POLICY "Student reads competitions of own owner"
  ON public.dojo_competitions FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads own competition athletes"
  ON public.dojo_competition_athletes FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id());

CREATE POLICY "Student self-register competition"
  ON public.dojo_competition_athletes FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.get_my_student_id()
    AND owner_id = public.get_my_student_owner_id()
  );

-- Vídeos (user_id, não student_id)
CREATE POLICY "Student reads owner videos"
  ON public.dojo_videos FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads owner video categories"
  ON public.dojo_video_categories FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student manages own video progress"
  ON public.dojo_video_progress FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Student manages own video favorites"
  ON public.dojo_video_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Identidade visual
CREATE POLICY "Student reads own academy branding"
  ON public.dojo_academy_profile FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE POLICY "Student reads own checkin settings"
  ON public.dojo_checkin_settings FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());
