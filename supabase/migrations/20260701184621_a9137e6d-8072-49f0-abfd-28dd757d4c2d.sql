
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text NOT NULL,
  image_url text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','publishing','published','failed','cancelled')),
  ig_media_id text,
  ig_permalink text,
  error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.scheduled_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.scheduled_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.scheduled_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.scheduled_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_scheduled_posts
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_scheduled_posts_due ON public.scheduled_posts (scheduled_for) WHERE status = 'scheduled';
