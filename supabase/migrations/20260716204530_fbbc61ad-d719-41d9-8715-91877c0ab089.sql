
ALTER TABLE public.prospect_settings
  ADD COLUMN IF NOT EXISTS instagram_template TEXT,
  ADD COLUMN IF NOT EXISTS instagram_media_url TEXT;
