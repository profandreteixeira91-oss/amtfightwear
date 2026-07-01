
CREATE POLICY "service_all_ig_media" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'ig-media') WITH CHECK (bucket_id = 'ig-media');

CREATE TABLE public.auto_post_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  schedule_hours_utc integer[] NOT NULL DEFAULT ARRAY[14,22],
  tone text NOT NULL DEFAULT 'motivacional',
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_run_at timestamptz,
  last_status text,
  last_error text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.auto_post_settings TO authenticated;
GRANT ALL ON public.auto_post_settings TO service_role;

ALTER TABLE public.auto_post_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read" ON public.auto_post_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON public.auto_post_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update" ON public.auto_post_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_updated_at_auto_post_settings
  BEFORE UPDATE ON public.auto_post_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.auto_post_settings (enabled) VALUES (false);

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
