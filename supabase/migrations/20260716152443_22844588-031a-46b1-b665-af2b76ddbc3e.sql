
CREATE TABLE public.store_size_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key text NOT NULL UNIQUE,
  category_label text NOT NULL,
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_size_presets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_size_presets TO authenticated;
GRANT ALL ON public.store_size_presets TO service_role;

ALTER TABLE public.store_size_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read size presets"
  ON public.store_size_presets FOR SELECT
  USING (true);

CREATE POLICY "Admins manage size presets"
  ON public.store_size_presets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_store_size_presets_updated_at
  BEFORE UPDATE ON public.store_size_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.store_size_presets (category_key, category_label, sizes, sort_order) VALUES
  ('kimono', 'Kimono', '["A0","A1","A2","A3","A4"]'::jsonb, 1),
  ('faixa', 'Faixa', '["M0","M1","M2","M3","M4","M5"]'::jsonb, 2),
  ('camiseta', 'Camiseta', '["PP","P","M","G","GG"]'::jsonb, 3),
  ('rashguard', 'Rashguard', '["PP","P","M","G","GG"]'::jsonb, 4)
ON CONFLICT (category_key) DO NOTHING;
