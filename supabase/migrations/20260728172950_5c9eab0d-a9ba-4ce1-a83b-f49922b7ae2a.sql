CREATE TABLE public.dojo_student_notification_prefs (
  owner_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  categories JSONB NOT NULL DEFAULT jsonb_build_object(
    'class_reminder', true,
    'invoice_due_soon', true,
    'invoice_overdue', true,
    'payment_received', true,
    'announcement', true,
    'graduation', true,
    'new_video', true,
    'evaluation', true,
    'attendance_confirmed', true,
    'contract', true,
    'competition', true,
    'plan_change', true
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_notification_prefs TO authenticated;
GRANT ALL ON public.dojo_student_notification_prefs TO service_role;

ALTER TABLE public.dojo_student_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own notification prefs"
  ON public.dojo_student_notification_prefs
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER trg_dojo_student_notification_prefs_updated
  BEFORE UPDATE ON public.dojo_student_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();