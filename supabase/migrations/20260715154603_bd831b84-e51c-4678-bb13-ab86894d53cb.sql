
-- ============================================================
-- CUSTOM SHOP — módulo de produtos customizáveis (kimono, rashguard, faixa)
-- ============================================================

-- 1. Templates (um por tipo de produto customizável)
CREATE TABLE public.custom_shop_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  production_days integer NOT NULL DEFAULT 20,
  base_image_url text,
  preview_ratio numeric(6,3) NOT NULL DEFAULT 1.0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_shop_templates TO anon, authenticated;
GRANT ALL ON public.custom_shop_templates TO service_role;
ALTER TABLE public.custom_shop_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active templates" ON public.custom_shop_templates FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manage templates" ON public.custom_shop_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_custom_shop_templates_updated BEFORE UPDATE ON public.custom_shop_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Zonas de cor por template (partes que o cliente colore)
CREATE TABLE public.custom_shop_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_shop_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  default_hex text NOT NULL DEFAULT '#ffffff',
  mask_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, key)
);
GRANT SELECT ON public.custom_shop_zones TO anon, authenticated;
GRANT ALL ON public.custom_shop_zones TO service_role;
ALTER TABLE public.custom_shop_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read zones" ON public.custom_shop_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage zones" ON public.custom_shop_zones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Posições disponíveis para patches (peito, manga, costas, etc.)
CREATE TABLE public.custom_shop_patch_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_shop_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  x_pct numeric(5,2) NOT NULL,
  y_pct numeric(5,2) NOT NULL,
  w_pct numeric(5,2) NOT NULL DEFAULT 15,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, key)
);
GRANT SELECT ON public.custom_shop_patch_slots TO anon, authenticated;
GRANT ALL ON public.custom_shop_patch_slots TO service_role;
ALTER TABLE public.custom_shop_patch_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read slots" ON public.custom_shop_patch_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage slots" ON public.custom_shop_patch_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Catálogo global de patches disponíveis
CREATE TABLE public.custom_shop_patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_shop_patches TO anon, authenticated;
GRANT ALL ON public.custom_shop_patches TO service_role;
ALTER TABLE public.custom_shop_patches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active patches" ON public.custom_shop_patches FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manage patches" ON public.custom_shop_patches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_custom_shop_patches_updated BEFORE UPDATE ON public.custom_shop_patches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Opções de tecido / gramatura por template
CREATE TABLE public.custom_shop_fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_shop_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_delta numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_shop_fabrics TO anon, authenticated;
GRANT ALL ON public.custom_shop_fabrics TO service_role;
ALTER TABLE public.custom_shop_fabrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fabrics" ON public.custom_shop_fabrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage fabrics" ON public.custom_shop_fabrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Extensão de itens de pedido para carregar customização e prazo
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS custom_config jsonb;
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS production_days integer;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS max_production_days integer;

-- 7. Seed inicial: 3 templates com zonas, slots e tecidos padrão
WITH t AS (
  INSERT INTO public.custom_shop_templates (kind, name, description, base_price, production_days, sort_order) VALUES
    ('kimono', 'Kimono BJJ Custom', 'Monte seu kimono com cores, patches e nome bordado.', 599.00, 25, 1),
    ('rashguard', 'Rashguard Custom', 'Rashguard sob medida com sua paleta e patches.', 189.00, 15, 2),
    ('faixa', 'Faixa Personalizada', 'Faixa com nome da academia bordado e ponta customizada.', 149.00, 12, 3)
  RETURNING id, kind
),
z AS (
  INSERT INTO public.custom_shop_zones (template_id, key, label, default_hex, sort_order)
  SELECT t.id, z.key, z.label, z.hex, z.ord FROM t
  JOIN (VALUES
    ('kimono','jaqueta','Jaqueta','#ffffff',1),
    ('kimono','gola','Gola','#111111',2),
    ('kimono','calca','Calça','#ffffff',3),
    ('kimono','punho','Punho e barra','#1e3a8a',4),
    ('rashguard','base','Corpo','#111111',1),
    ('rashguard','manga','Mangas','#dc2626',2),
    ('rashguard','lateral','Faixa lateral','#ffffff',3),
    ('faixa','corpo','Corpo da faixa','#111827',1),
    ('faixa','ponta','Ponta bordada','#000000',2)
  ) z(kind,key,label,hex,ord) ON z.kind = t.kind
  RETURNING template_id
),
s AS (
  INSERT INTO public.custom_shop_patch_slots (template_id, key, label, x_pct, y_pct, w_pct, sort_order)
  SELECT t.id, s.key, s.label, s.x, s.y, s.w, s.ord FROM t
  JOIN (VALUES
    ('kimono','peito_esq','Peito esquerdo',30,32,14,1),
    ('kimono','peito_dir','Peito direito',70,32,14,2),
    ('kimono','manga_esq','Manga esquerda',12,42,12,3),
    ('kimono','manga_dir','Manga direita',88,42,12,4),
    ('kimono','costas','Costas',50,55,28,5),
    ('rashguard','peito','Peito',50,30,20,1),
    ('rashguard','manga_esq','Manga esquerda',12,45,10,2),
    ('rashguard','manga_dir','Manga direita',88,45,10,3),
    ('rashguard','costas','Costas',50,55,26,4),
    ('faixa','ponta','Ponta bordada',80,50,14,1)
  ) s(kind,key,label,x,y,w,ord) ON s.kind = t.kind
  RETURNING template_id
),
f AS (
  INSERT INTO public.custom_shop_fabrics (template_id, name, description, price_delta, sort_order)
  SELECT t.id, f.name, f.descr, f.delta, f.ord FROM t
  JOIN (VALUES
    ('kimono','Pearl Weave 450g','Trançado pérola, leve e resistente.',0,1),
    ('kimono','Pearl Weave 550g','Mais encorpado, ideal para competição.',80,2),
    ('kimono','Gold Weave','Trançado premium, toque nobre.',180,3),
    ('rashguard','Poliamida 220g','Compressão média, respirável.',0,1),
    ('rashguard','Compressão 260g','Alta compressão para competição.',60,2),
    ('faixa','Algodão premium','Tecido tradicional AMT.',0,1),
    ('faixa','Algodão pesado reforçado','Costura dupla, ponta reforçada.',30,2)
  ) f(kind,name,descr,delta,ord) ON f.kind = t.kind
  RETURNING template_id
)
SELECT 1;

-- 8. Patches iniciais (catálogo genérico — admin substitui imagens depois)
INSERT INTO public.custom_shop_patches (name, image_url, price, sort_order) VALUES
  ('Logo AMT redondo', 'https://placehold.co/200x200/dc2626/ffffff?text=AMT', 25.00, 1),
  ('Bandeira Brasil', 'https://placehold.co/240x160/16a34a/facc15?text=BR', 20.00, 2),
  ('Kanji Jiu-Jitsu', 'https://placehold.co/200x200/111827/ffffff?text=%E6%9F%94', 30.00, 3),
  ('Escudo Judô', 'https://placehold.co/200x200/1e3a8a/ffffff?text=Judo', 28.00, 4),
  ('Faixa preta stripe', 'https://placehold.co/240x120/000000/ffffff?text=BLACK', 22.00, 5);
