
-- 1) Slug column
ALTER TABLE public.dojo_academy_profile
  ADD COLUMN IF NOT EXISTS slug text;

-- 2) Slug generator (lowercase, ascii-safe)
CREATE OR REPLACE FUNCTION public.dojo_slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  s := lower(unaccent(input));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF length(s) = 0 THEN RETURN NULL; END IF;
  RETURN left(s, 40);
END;
$$;

-- unaccent may not be installed; fallback safe version
CREATE OR REPLACE FUNCTION public.dojo_slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE s text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  s := lower(input);
  s := translate(s,
    'áàâãäåéèêëíìîïóòôõöúùûüçñ',
    'aaaaaaeeeeiiiiooooouuuucn');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  IF length(s) = 0 THEN RETURN NULL; END IF;
  RETURN left(s, 40);
END;
$$;

-- 3) Backfill slugs (unique per owner)
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT owner_id, trade_name, legal_name FROM public.dojo_academy_profile WHERE slug IS NULL LOOP
    base := coalesce(public.dojo_slugify(r.trade_name), public.dojo_slugify(r.legal_name), 'dojo');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.dojo_academy_profile WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    UPDATE public.dojo_academy_profile SET slug = candidate WHERE owner_id = r.owner_id;
  END LOOP;
END $$;

-- 4) Auto-slug trigger
CREATE OR REPLACE FUNCTION public.dojo_academy_ensure_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := coalesce(public.dojo_slugify(NEW.trade_name), public.dojo_slugify(NEW.legal_name), 'dojo');
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.dojo_academy_profile WHERE slug = candidate AND owner_id <> NEW.owner_id) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dojo_academy_ensure_slug ON public.dojo_academy_profile;
CREATE TRIGGER trg_dojo_academy_ensure_slug
BEFORE INSERT OR UPDATE OF slug, trade_name, legal_name ON public.dojo_academy_profile
FOR EACH ROW EXECUTE FUNCTION public.dojo_academy_ensure_slug();

-- 5) Unique index
CREATE UNIQUE INDEX IF NOT EXISTS dojo_academy_profile_slug_key
  ON public.dojo_academy_profile (slug);

-- 6) Public read RPC (branding only, no PII)
CREATE OR REPLACE FUNCTION public.get_academy_by_slug(_slug text)
RETURNS TABLE (
  slug text,
  trade_name text,
  legal_name text,
  logo_url text,
  brand_primary text,
  brand_secondary text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, trade_name, legal_name, logo_url, brand_primary, brand_secondary, city, state
  FROM public.dojo_academy_profile
  WHERE slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_academy_by_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_academy_by_slug(text) TO anon, authenticated;
