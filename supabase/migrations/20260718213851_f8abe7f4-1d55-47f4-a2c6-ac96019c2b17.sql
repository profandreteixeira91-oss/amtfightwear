ALTER TABLE public.dojo_certificate_templates
  ADD COLUMN IF NOT EXISTS variables jsonb,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;