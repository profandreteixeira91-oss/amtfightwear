
-- ==== Announcement Categories ====
CREATE TABLE public.dojo_announcement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  color text DEFAULT '#dc2626',
  icon text DEFAULT 'Megaphone',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcement_categories TO authenticated;
GRANT ALL ON public.dojo_announcement_categories TO service_role;
ALTER TABLE public.dojo_announcement_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_owner_all" ON public.dojo_announcement_categories FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "cat_student_read" ON public.dojo_announcement_categories FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());
CREATE TRIGGER trg_dojo_ann_cat_updated BEFORE UPDATE ON public.dojo_announcement_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==== Announcements ====
CREATE TABLE public.dojo_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  category_id uuid REFERENCES public.dojo_announcement_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  summary text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  color text DEFAULT '#dc2626',
  icon text DEFAULT 'Megaphone',
  author_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  featured boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  allow_comments boolean NOT NULL DEFAULT true,
  allow_likes boolean NOT NULL DEFAULT true,
  require_read_confirmation boolean NOT NULL DEFAULT false,
  send_notification boolean NOT NULL DEFAULT true,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  target_scope text NOT NULL DEFAULT 'all' CHECK (target_scope IN ('all','custom')),
  view_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_ann_owner_pub ON public.dojo_announcements (owner_id, status, publish_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcements TO authenticated;
GRANT ALL ON public.dojo_announcements TO service_role;
ALTER TABLE public.dojo_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_owner_all" ON public.dojo_announcements FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ann_student_read_published" ON public.dojo_announcements FOR SELECT TO authenticated
  USING (
    owner_id = public.get_my_student_owner_id()
    AND status = 'published'
    AND publish_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );
CREATE TRIGGER trg_dojo_ann_updated BEFORE UPDATE ON public.dojo_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==== Targets ====
CREATE TABLE public.dojo_announcement_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.dojo_announcements(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('all','class','unit','belt','status','student')),
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_ann_targets_ann ON public.dojo_announcement_targets (announcement_id);
CREATE INDEX idx_dojo_ann_targets_lookup ON public.dojo_announcement_targets (owner_id, target_type, target_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcement_targets TO authenticated;
GRANT ALL ON public.dojo_announcement_targets TO service_role;
ALTER TABLE public.dojo_announcement_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annt_owner_all" ON public.dojo_announcement_targets FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "annt_student_read" ON public.dojo_announcement_targets FOR SELECT TO authenticated
  USING (owner_id = public.get_my_student_owner_id());

-- ==== Reads ====
CREATE TABLE public.dojo_announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.dojo_announcements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  device text,
  ip text,
  UNIQUE (announcement_id, student_id)
);
CREATE INDEX idx_dojo_ann_reads_ann ON public.dojo_announcement_reads (announcement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcement_reads TO authenticated;
GRANT ALL ON public.dojo_announcement_reads TO service_role;
ALTER TABLE public.dojo_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annr_owner_all" ON public.dojo_announcement_reads FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "annr_student_self" ON public.dojo_announcement_reads FOR ALL TO authenticated
  USING (student_id = public.get_my_student_id()) WITH CHECK (student_id = public.get_my_student_id() AND owner_id = public.get_my_student_owner_id());

-- ==== Likes ====
CREATE TABLE public.dojo_announcement_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.dojo_announcements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  liked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, student_id)
);
CREATE INDEX idx_dojo_ann_likes_ann ON public.dojo_announcement_likes (announcement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcement_likes TO authenticated;
GRANT ALL ON public.dojo_announcement_likes TO service_role;
ALTER TABLE public.dojo_announcement_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annl_owner_read" ON public.dojo_announcement_likes FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_my_student_owner_id());
CREATE POLICY "annl_student_write" ON public.dojo_announcement_likes FOR ALL TO authenticated
  USING (student_id = public.get_my_student_id()) WITH CHECK (student_id = public.get_my_student_id() AND owner_id = public.get_my_student_owner_id());

-- ==== Comments ====
CREATE TABLE public.dojo_announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.dojo_announcements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_ann_comments_ann ON public.dojo_announcement_comments (announcement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_announcement_comments TO authenticated;
GRANT ALL ON public.dojo_announcement_comments TO service_role;
ALTER TABLE public.dojo_announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annc_owner_read" ON public.dojo_announcement_comments FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR owner_id = public.get_my_student_owner_id());
CREATE POLICY "annc_owner_manage" ON public.dojo_announcement_comments FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "annc_student_write" ON public.dojo_announcement_comments FOR INSERT TO authenticated
  WITH CHECK (student_id = public.get_my_student_id() AND owner_id = public.get_my_student_owner_id());
CREATE POLICY "annc_student_delete_own" ON public.dojo_announcement_comments FOR DELETE TO authenticated
  USING (student_id = public.get_my_student_id());

-- ==== Visibility helper: is announcement visible to a given student? ====
CREATE OR REPLACE FUNCTION public.dojo_announcement_visible_to_student(_ann uuid, _student uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  a record;
  has_targets boolean;
  matched boolean;
BEGIN
  SELECT * INTO s FROM public.dojo_students WHERE id = _student;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO a FROM public.dojo_announcements WHERE id = _ann AND owner_id = s.owner_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF a.status <> 'published' THEN RETURN false; END IF;
  IF a.publish_at > now() THEN RETURN false; END IF;
  IF a.expires_at IS NOT NULL AND a.expires_at <= now() THEN RETURN false; END IF;
  IF a.target_scope = 'all' THEN RETURN true; END IF;

  SELECT EXISTS(SELECT 1 FROM public.dojo_announcement_targets WHERE announcement_id = _ann) INTO has_targets;
  IF NOT has_targets THEN RETURN true; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dojo_announcement_targets t
    WHERE t.announcement_id = _ann
      AND (
        t.target_type = 'all'
        OR (t.target_type = 'student' AND t.target_id = _student::text)
        OR (t.target_type = 'unit'    AND s.unit_id IS NOT NULL AND t.target_id = s.unit_id::text)
        OR (t.target_type = 'belt'    AND s.current_belt_id IS NOT NULL AND t.target_id = s.current_belt_id::text)
        OR (t.target_type = 'status'  AND t.target_id = s.status)
        OR (t.target_type = 'class'   AND EXISTS (
              SELECT 1 FROM public.dojo_class_students cs
              WHERE cs.student_id = _student AND cs.class_id::text = t.target_id
        ))
      )
  ) INTO matched;
  RETURN COALESCE(matched, false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.dojo_announcement_visible_to_student(uuid, uuid) TO authenticated;
