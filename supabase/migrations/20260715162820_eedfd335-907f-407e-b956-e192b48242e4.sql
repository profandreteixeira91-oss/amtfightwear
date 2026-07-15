
-- Variants table
CREATE TABLE public.custom_shop_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_shop_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  base_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, key)
);
GRANT SELECT ON public.custom_shop_variants TO anon, authenticated;
GRANT ALL ON public.custom_shop_variants TO service_role;
ALTER TABLE public.custom_shop_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read variants" ON public.custom_shop_variants
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage variants" ON public.custom_shop_variants
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Zones: geometry + variant
ALTER TABLE public.custom_shop_zones
  ADD COLUMN variant_key text NOT NULL DEFAULT 'default',
  ADD COLUMN x_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN y_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN w_pct numeric(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN h_pct numeric(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN solid boolean NOT NULL DEFAULT false;
ALTER TABLE public.custom_shop_zones DROP CONSTRAINT custom_shop_zones_template_id_key_key;
ALTER TABLE public.custom_shop_zones
  ADD CONSTRAINT custom_shop_zones_template_variant_key UNIQUE(template_id, variant_key, key);

-- Slots: variant
ALTER TABLE public.custom_shop_patch_slots
  ADD COLUMN variant_key text NOT NULL DEFAULT 'default';
ALTER TABLE public.custom_shop_patch_slots DROP CONSTRAINT custom_shop_patch_slots_template_id_key_key;
ALTER TABLE public.custom_shop_patch_slots
  ADD CONSTRAINT custom_shop_patch_slots_template_variant_key UNIQUE(template_id, variant_key, key);

-- Seed default variant per template
INSERT INTO public.custom_shop_variants (template_id, key, label, sort_order)
SELECT id, 'default', name, 0 FROM public.custom_shop_templates
ON CONFLICT (template_id, key) DO NOTHING;

-- Faixa: rename default to Jiu-Jitsu and add Judo variant
UPDATE public.custom_shop_variants v SET label='Jiu-Jitsu'
FROM public.custom_shop_templates t
WHERE v.template_id=t.id AND t.kind='faixa' AND v.key='default';
INSERT INTO public.custom_shop_variants (template_id, key, label, sort_order)
SELECT id, 'judo', 'Judô', 1 FROM public.custom_shop_templates WHERE kind='faixa'
ON CONFLICT (template_id, key) DO NOTHING;

-- Default rectangle geometry per zone (bounding boxes of the previous hardcoded paths)
UPDATE public.custom_shop_zones z SET x_pct=0,  y_pct=10, w_pct=100, h_pct=16
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='kimono' AND z.key='punho';
UPDATE public.custom_shop_zones z SET x_pct=0,  y_pct=10, w_pct=100, h_pct=50
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='kimono' AND z.key='jaqueta';
UPDATE public.custom_shop_zones z SET x_pct=42, y_pct=8,  w_pct=16,  h_pct=52
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='kimono' AND z.key='gola';
UPDATE public.custom_shop_zones z SET x_pct=26, y_pct=60, w_pct=48,  h_pct=36
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='kimono' AND z.key='calca';
UPDATE public.custom_shop_zones z SET x_pct=34, y_pct=22, w_pct=32,  h_pct=65
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='rashguard' AND z.key='base';
UPDATE public.custom_shop_zones z SET x_pct=8,  y_pct=22, w_pct=84,  h_pct=46
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='rashguard' AND z.key='manga';
UPDATE public.custom_shop_zones z SET x_pct=32, y_pct=22, w_pct=36,  h_pct=65
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='rashguard' AND z.key='lateral';
UPDATE public.custom_shop_zones z SET x_pct=2,  y_pct=44, w_pct=69,  h_pct=13, solid=false
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='faixa' AND z.key='corpo';
UPDATE public.custom_shop_zones z SET x_pct=71, y_pct=44, w_pct=27,  h_pct=13, solid=true
  FROM public.custom_shop_templates t WHERE z.template_id=t.id AND t.kind='faixa' AND z.key='ponta';

-- Judo variant rows
INSERT INTO public.custom_shop_zones (template_id, variant_key, key, label, default_hex, x_pct, y_pct, w_pct, h_pct, solid, sort_order)
SELECT id, 'judo', 'corpo', 'Corpo da faixa', '#ffffff', 0,  30.9, 82,  15, false, 1
FROM public.custom_shop_templates WHERE kind='faixa'
ON CONFLICT (template_id, variant_key, key) DO NOTHING;
INSERT INTO public.custom_shop_zones (template_id, variant_key, key, label, default_hex, x_pct, y_pct, w_pct, h_pct, solid, sort_order)
SELECT id, 'judo', 'ponta', 'Ponta bordada', '#0a0a0a', 82, 30.9, 3.5, 15, true,  2
FROM public.custom_shop_templates WHERE kind='faixa'
ON CONFLICT (template_id, variant_key, key) DO NOTHING;
INSERT INTO public.custom_shop_patch_slots (template_id, variant_key, key, label, x_pct, y_pct, w_pct, sort_order)
SELECT id, 'judo', 'ponta', 'Ponta bordada', 73, 38.3, 10, 1
FROM public.custom_shop_templates WHERE kind='faixa'
ON CONFLICT (template_id, variant_key, key) DO NOTHING;
