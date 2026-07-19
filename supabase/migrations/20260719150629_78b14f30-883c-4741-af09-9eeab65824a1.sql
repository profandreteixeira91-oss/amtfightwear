
-- URL pública configurável por academia (usada para gerar QR estável)
ALTER TABLE public.dojo_academy_profile
  ADD COLUMN IF NOT EXISTS public_url text;

-- Versões do APK do App do Aluno (por dono/academia)
CREATE TABLE IF NOT EXISTS public.dojo_app_apk_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_name text NOT NULL,
  build_code integer NOT NULL DEFAULT 1,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/vnd.android.package-archive',
  release_notes text,
  is_published boolean NOT NULL DEFAULT false,
  downloads integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_app_apk_versions TO authenticated;
GRANT ALL ON public.dojo_app_apk_versions TO service_role;

ALTER TABLE public.dojo_app_apk_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_apk_versions"
  ON public.dojo_app_apk_versions
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_apk_versions_owner ON public.dojo_app_apk_versions(owner_id, is_published, created_at DESC);

CREATE TRIGGER trg_apk_versions_updated_at
  BEFORE UPDATE ON public.dojo_app_apk_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Log de downloads
CREATE TABLE IF NOT EXISTS public.dojo_app_apk_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apk_version_id uuid NOT NULL REFERENCES public.dojo_app_apk_versions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  slug text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dojo_app_apk_downloads TO authenticated;
GRANT ALL ON public.dojo_app_apk_downloads TO service_role;

ALTER TABLE public.dojo_app_apk_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_apk_downloads"
  ON public.dojo_app_apk_downloads
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_apk_downloads_owner ON public.dojo_app_apk_downloads(owner_id, created_at DESC);

-- RPC pública para resolver a última versão publicada por slug
CREATE OR REPLACE FUNCTION public.get_latest_apk_by_slug(_slug text)
RETURNS TABLE(
  id uuid,
  owner_id uuid,
  version_name text,
  build_code integer,
  file_name text,
  file_size bigint,
  release_notes text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.owner_id, v.version_name, v.build_code, v.file_name, v.file_size, v.release_notes, v.created_at
  FROM public.dojo_app_apk_versions v
  JOIN public.dojo_academy_profile a ON a.owner_id = v.owner_id
  WHERE a.slug = _slug AND v.is_published = true
  ORDER BY v.build_code DESC, v.created_at DESC
  LIMIT 1;
$$;
