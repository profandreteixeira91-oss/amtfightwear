ALTER TABLE public.dojo_academy_profile
  ADD COLUMN IF NOT EXISTS security_pin_hash text,
  ADD COLUMN IF NOT EXISTS security_pin_updated_at timestamptz;