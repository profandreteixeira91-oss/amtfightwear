
-- Tabela de configuração publicada + rascunho (uma por academia)
CREATE TABLE public.dojo_student_app_config (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  has_unpublished_changes boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_app_config TO authenticated;
GRANT ALL ON public.dojo_student_app_config TO service_role;
ALTER TABLE public.dojo_student_app_config ENABLE ROW LEVEL SECURITY;

-- Admin da academia gerencia sua config
CREATE POLICY "owner_manage_app_config" ON public.dojo_student_app_config
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Aluno lê a config publicada da sua academia
CREATE POLICY "student_read_app_config" ON public.dojo_student_app_config
  FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

CREATE TRIGGER trg_dojo_student_app_config_updated
  BEFORE UPDATE ON public.dojo_student_app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Histórico de versões publicadas
CREATE TABLE public.dojo_student_app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  label text,
  config jsonb NOT NULL,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, version)
);
CREATE INDEX idx_app_versions_owner ON public.dojo_student_app_versions(owner_id, version DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_app_versions TO authenticated;
GRANT ALL ON public.dojo_student_app_versions TO service_role;
ALTER TABLE public.dojo_student_app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_app_versions" ON public.dojo_student_app_versions
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Notícias e banners
CREATE TABLE public.dojo_student_app_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'news' CHECK (kind IN ('news','banner','announcement','event','promo')),
  title text NOT NULL,
  body text,
  image_url text,
  cta_label text,
  cta_link text,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  audience text NOT NULL DEFAULT 'all',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_news_owner ON public.dojo_student_app_news(owner_id, active, priority DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_student_app_news TO authenticated;
GRANT ALL ON public.dojo_student_app_news TO service_role;
ALTER TABLE public.dojo_student_app_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_app_news" ON public.dojo_student_app_news
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "student_read_app_news" ON public.dojo_student_app_news
  FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id() AND active = true);

CREATE TRIGGER trg_dojo_student_app_news_updated
  BEFORE UPDATE ON public.dojo_student_app_news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
