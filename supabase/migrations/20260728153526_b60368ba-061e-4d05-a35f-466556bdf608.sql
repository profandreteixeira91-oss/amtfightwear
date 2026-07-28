ALTER TABLE public.dojo_checkin_settings
  ADD COLUMN IF NOT EXISTS allow_gps_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_pin_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_qr_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_fixed_qr_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_photo_checkin boolean NOT NULL DEFAULT false;