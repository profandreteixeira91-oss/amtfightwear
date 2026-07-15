ALTER TABLE public.custom_shop_patch_slots
  ADD COLUMN IF NOT EXISTS h_pct numeric(6,2),
  ADD COLUMN IF NOT EXISTS rotation_deg numeric(6,2) NOT NULL DEFAULT 0;

ALTER TABLE public.custom_shop_zones
  ADD COLUMN IF NOT EXISTS rotation_deg numeric(6,2) NOT NULL DEFAULT 0;