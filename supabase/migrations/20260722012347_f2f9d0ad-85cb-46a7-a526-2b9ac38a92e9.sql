
ALTER TABLE public.dojo_belts
  ADD COLUMN IF NOT EXISTS visual jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;
