
-- 1) extras column on dojo_student_notification_prefs
ALTER TABLE public.dojo_student_notification_prefs
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) idempotency table for class reminders
CREATE TABLE IF NOT EXISTS public.dojo_class_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  occurrence_start_time time NOT NULL,
  offset_minutes integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dojo_class_reminders_sent_idem
  ON public.dojo_class_reminders_sent
  (student_id, class_id, occurrence_date, occurrence_start_time, offset_minutes);

CREATE INDEX IF NOT EXISTS dojo_class_reminders_sent_owner_idx
  ON public.dojo_class_reminders_sent (owner_id, sent_at DESC);

GRANT SELECT ON public.dojo_class_reminders_sent TO authenticated;
GRANT ALL ON public.dojo_class_reminders_sent TO service_role;

ALTER TABLE public.dojo_class_reminders_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their class reminders" ON public.dojo_class_reminders_sent;
CREATE POLICY "Owners can view their class reminders"
  ON public.dojo_class_reminders_sent FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
