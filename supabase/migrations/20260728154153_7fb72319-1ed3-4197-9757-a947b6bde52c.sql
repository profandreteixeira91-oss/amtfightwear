ALTER TABLE public.dojo_checkin_settings
  ADD COLUMN IF NOT EXISTS checkin_window_pre_mins integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS checkin_window_post_mins integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS allow_admin_exception boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_teacher_exception boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_duplicate_checkin boolean NOT NULL DEFAULT true;