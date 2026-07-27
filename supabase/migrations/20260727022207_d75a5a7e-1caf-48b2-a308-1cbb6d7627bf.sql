ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_since timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_until date;

CREATE INDEX IF NOT EXISTS dojo_students_cancelled_at_idx ON public.dojo_students (cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS dojo_students_frozen_until_idx ON public.dojo_students (frozen_until) WHERE frozen_until IS NOT NULL;