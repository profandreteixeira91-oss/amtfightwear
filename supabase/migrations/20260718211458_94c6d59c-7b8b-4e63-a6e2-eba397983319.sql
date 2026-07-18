
-- =========== CATEGORIAS ===========
CREATE TABLE public.dojo_video_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  parent_id uuid REFERENCES public.dojo_video_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_video_categories_owner ON public.dojo_video_categories(owner_id);
CREATE INDEX idx_dojo_video_categories_parent ON public.dojo_video_categories(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_video_categories TO authenticated;
GRANT ALL ON public.dojo_video_categories TO service_role;
ALTER TABLE public.dojo_video_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.dojo_video_categories FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =========== VÍDEOS ===========
CREATE TABLE public.dojo_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  category_id uuid REFERENCES public.dojo_video_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.dojo_video_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  teacher_id uuid,
  teacher_name text,
  thumbnail_url text,
  video_url text,
  video_source text NOT NULL DEFAULT 'upload',
  provider_id text,
  duration_seconds int,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'exclusive',
  access_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  views_count int NOT NULL DEFAULT 0,
  likes_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  scheduled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_videos_owner ON public.dojo_videos(owner_id);
CREATE INDEX idx_dojo_videos_category ON public.dojo_videos(category_id);
CREATE INDEX idx_dojo_videos_status ON public.dojo_videos(status);
CREATE INDEX idx_dojo_videos_published ON public.dojo_videos(published_at DESC);
CREATE INDEX idx_dojo_videos_search ON public.dojo_videos USING gin (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_videos TO authenticated;
GRANT ALL ON public.dojo_videos TO service_role;
ALTER TABLE public.dojo_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own videos" ON public.dojo_videos FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER dojo_videos_set_updated_at BEFORE UPDATE ON public.dojo_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER dojo_video_categories_set_updated_at BEFORE UPDATE ON public.dojo_video_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== PROGRESSO ===========
CREATE TABLE public.dojo_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.dojo_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  watched_seconds int NOT NULL DEFAULT 0,
  percent numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);
CREATE INDEX idx_dojo_video_progress_user ON public.dojo_video_progress(user_id);
CREATE INDEX idx_dojo_video_progress_owner ON public.dojo_video_progress(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_video_progress TO authenticated;
GRANT ALL ON public.dojo_video_progress TO service_role;
ALTER TABLE public.dojo_video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.dojo_video_progress FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = owner_id);

-- =========== FAVORITOS ===========
CREATE TABLE public.dojo_video_favorites (
  video_id uuid NOT NULL REFERENCES public.dojo_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_video_favorites TO authenticated;
GRANT ALL ON public.dojo_video_favorites TO service_role;
ALTER TABLE public.dojo_video_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.dojo_video_favorites FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = owner_id);

-- =========== COMENTÁRIOS ===========
CREATE TABLE public.dojo_video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.dojo_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  parent_id uuid REFERENCES public.dojo_video_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  likes int NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  author_name text,
  author_avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_video_comments_video ON public.dojo_video_comments(video_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_video_comments TO authenticated;
GRANT ALL ON public.dojo_video_comments TO service_role;
ALTER TABLE public.dojo_video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or owner comments" ON public.dojo_video_comments FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = owner_id);
CREATE POLICY "insert own comments" ON public.dojo_video_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own or owner comments" ON public.dojo_video_comments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = owner_id);
CREATE POLICY "delete own or owner comments" ON public.dojo_video_comments FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = owner_id);

CREATE TRIGGER dojo_video_comments_set_updated_at BEFORE UPDATE ON public.dojo_video_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== VIEWS (log) ===========
CREATE TABLE public.dojo_video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.dojo_videos(id) ON DELETE CASCADE,
  user_id uuid,
  owner_id uuid NOT NULL,
  seconds_watched int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_video_views_video ON public.dojo_video_views(video_id);
CREATE INDEX idx_dojo_video_views_owner ON public.dojo_video_views(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_video_views TO authenticated;
GRANT ALL ON public.dojo_video_views TO service_role;
ALTER TABLE public.dojo_video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own views" ON public.dojo_video_views FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = owner_id);
