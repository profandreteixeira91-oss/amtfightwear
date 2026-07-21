
ALTER TABLE public.dojo_belts
  ADD COLUMN IF NOT EXISTS criteria_mode text NOT NULL DEFAULT 'time',
  ADD COLUMN IF NOT EXISTS min_classes integer;

ALTER TABLE public.dojo_belts
  DROP CONSTRAINT IF EXISTS dojo_belts_criteria_mode_check;
ALTER TABLE public.dojo_belts
  ADD CONSTRAINT dojo_belts_criteria_mode_check
  CHECK (criteria_mode IN ('time','classes','evaluation','merit'));

ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS graduation_criteria_mode text,
  ADD COLUMN IF NOT EXISTS graduation_min_classes integer,
  ADD COLUMN IF NOT EXISTS graduation_min_months integer;

ALTER TABLE public.dojo_students
  DROP CONSTRAINT IF EXISTS dojo_students_graduation_criteria_mode_check;
ALTER TABLE public.dojo_students
  ADD CONSTRAINT dojo_students_graduation_criteria_mode_check
  CHECK (graduation_criteria_mode IS NULL OR graduation_criteria_mode IN ('time','classes','evaluation','merit'));
