
ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS rating_count integer,
  ADD COLUMN IF NOT EXISTS quality_tier text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_companies_owner_place
  ON public.prospect_companies(owner_id, google_place_id)
  WHERE google_place_id IS NOT NULL;
