
ALTER TABLE public.dojo_checkin_settings
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision,
  ADD COLUMN IF NOT EXISTS geo_radius_m integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS geo_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geo_address text;
