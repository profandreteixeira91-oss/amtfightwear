-- Garantir colunas de exceção e recarregar cache do PostgREST
ALTER TABLE public.dojo_checkin_settings
  ADD COLUMN IF NOT EXISTS allow_admin_exception boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_teacher_exception boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_duplicate_checkin boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';