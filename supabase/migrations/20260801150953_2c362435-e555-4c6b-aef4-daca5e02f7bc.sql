ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(8,2);