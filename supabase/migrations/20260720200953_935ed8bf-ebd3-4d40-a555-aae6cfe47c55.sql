
-- ============================================================
-- 1) FIX: Conceder papel 'admin' automaticamente a novos donos
--    (raiz dos erros ao salvar aluno/faixa em contas recém-criadas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Garantir papel admin para o próprio tenant (Dojo Manager multi-tenant)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Garantir trigger em auth.users (recriar caso ausente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: qualquer profile sem admin recebe agora
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = p.id AND r.role = 'admin'::public.app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 2) Modalidade em dojo_belts + templates globais
-- ============================================================
ALTER TABLE public.dojo_belts
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'jiu-jitsu';

-- owner_id passa a permitir NULL para templates globais
ALTER TABLE public.dojo_belts ALTER COLUMN owner_id DROP NOT NULL;

-- Índice único deve incluir modalidade
DROP INDEX IF EXISTS dojo_belts_owner_name_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS dojo_belts_owner_modality_name_uniq
  ON public.dojo_belts(COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), modality, name);

CREATE INDEX IF NOT EXISTS idx_dojo_belts_modality ON public.dojo_belts(modality);

-- Policies: permitir manage de templates globais por qualquer admin
DROP POLICY IF EXISTS "admins manage belts" ON public.dojo_belts;
CREATE POLICY "admins manage belts" ON public.dojo_belts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 3) Seed de faixas globais (owner_id NULL) por modalidade
-- ============================================================
-- Karate (Shotokan)
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, sort_order, max_degrees, category, modality, owner_id) VALUES
  ('Branca',   '#F5F5F5', NULL,      1,  0, 'adult', 'karate', NULL),
  ('Amarela',  '#FFD54F', NULL,      2,  0, 'adult', 'karate', NULL),
  ('Laranja',  '#FB8C00', NULL,      3,  0, 'adult', 'karate', NULL),
  ('Verde',    '#2E7D32', NULL,      4,  0, 'adult', 'karate', NULL),
  ('Azul',     '#1E63C4', NULL,      5,  0, 'adult', 'karate', NULL),
  ('Roxa',     '#6A1B9A', NULL,      6,  0, 'adult', 'karate', NULL),
  ('Marrom',   '#5D4037', NULL,      7,  0, 'adult', 'karate', NULL),
  ('Preta',    '#111111', NULL,      8, 10, 'adult', 'karate', NULL)
ON CONFLICT DO NOTHING;

-- Taekwondo (WT) — pontas coloridas via stripe_hex
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, sort_order, max_degrees, category, modality, owner_id) VALUES
  ('Branca',            '#F5F5F5', NULL,      1, 0, 'adult', 'taekwondo', NULL),
  ('Branca ponta amarela','#F5F5F5','#FFD54F', 2, 0, 'adult', 'taekwondo', NULL),
  ('Amarela',           '#FFD54F', NULL,      3, 0, 'adult', 'taekwondo', NULL),
  ('Amarela ponta verde','#FFD54F','#2E7D32', 4, 0, 'adult', 'taekwondo', NULL),
  ('Verde',             '#2E7D32', NULL,      5, 0, 'adult', 'taekwondo', NULL),
  ('Verde ponta azul',  '#2E7D32', '#1E63C4', 6, 0, 'adult', 'taekwondo', NULL),
  ('Azul',              '#1E63C4', NULL,      7, 0, 'adult', 'taekwondo', NULL),
  ('Azul ponta vermelha','#1E63C4','#C62828', 8, 0, 'adult', 'taekwondo', NULL),
  ('Vermelha',          '#C62828', NULL,      9, 0, 'adult', 'taekwondo', NULL),
  ('Vermelha ponta preta','#C62828','#111111',10,0, 'adult', 'taekwondo', NULL),
  ('Preta',             '#111111', NULL,     11, 9, 'adult', 'taekwondo', NULL)
ON CONFLICT DO NOTHING;

-- Muay Thai (Prajioud - armband)
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, sort_order, max_degrees, category, modality, owner_id) VALUES
  ('Branca',   '#F5F5F5', NULL,      1, 0, 'adult', 'muay-thai', NULL),
  ('Amarela',  '#FFD54F', NULL,      2, 0, 'adult', 'muay-thai', NULL),
  ('Verde',    '#2E7D32', NULL,      3, 0, 'adult', 'muay-thai', NULL),
  ('Azul',     '#1E63C4', NULL,      4, 0, 'adult', 'muay-thai', NULL),
  ('Marrom',   '#5D4037', NULL,      5, 0, 'adult', 'muay-thai', NULL),
  ('Vermelha', '#C62828', NULL,      6, 0, 'adult', 'muay-thai', NULL),
  ('Prata',    '#B0BEC5', NULL,      7, 0, 'adult', 'muay-thai', NULL),
  ('Dourada',  '#C5A657', NULL,      8, 0, 'adult', 'muay-thai', NULL)
ON CONFLICT DO NOTHING;

-- Judô (CBJ)
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, sort_order, max_degrees, category, modality, owner_id) VALUES
  ('Branca',   '#F5F5F5', NULL,      1, 0, 'adult', 'judo', NULL),
  ('Cinza',    '#9E9E9E', NULL,      2, 0, 'adult', 'judo', NULL),
  ('Azul',     '#1E63C4', NULL,      3, 0, 'adult', 'judo', NULL),
  ('Amarela',  '#FFD54F', NULL,      4, 0, 'adult', 'judo', NULL),
  ('Laranja',  '#FB8C00', NULL,      5, 0, 'adult', 'judo', NULL),
  ('Verde',    '#2E7D32', NULL,      6, 0, 'adult', 'judo', NULL),
  ('Roxa',     '#6A1B9A', NULL,      7, 0, 'adult', 'judo', NULL),
  ('Marrom',   '#5D4037', NULL,      8, 0, 'adult', 'judo', NULL),
  ('Preta',    '#111111', NULL,      9, 10,'adult', 'judo', NULL)
ON CONFLICT DO NOTHING;

-- Marcar faixas existentes (BJJ) explicitamente como jiu-jitsu (já é default, mas garante)
UPDATE public.dojo_belts SET modality = 'jiu-jitsu' WHERE modality IS NULL OR modality = '';
