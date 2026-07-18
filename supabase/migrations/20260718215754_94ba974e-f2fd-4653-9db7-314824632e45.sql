
-- 1. Extensões de perfil pessoal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Perfil institucional da academia (1:1 por owner_id)
CREATE TABLE IF NOT EXISTS public.dojo_academy_profile (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text,
  trade_name text,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  facebook text,
  address text,
  city text,
  state text,
  zip text,
  modalities text[] DEFAULT '{}',
  logo_url text,
  logo_placements jsonb DEFAULT '{}'::jsonb,
  logo_as_default boolean DEFAULT true,
  signature_url text,
  stamp_url text,
  seal_url text,
  brand_primary text,
  brand_secondary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_academy_profile TO authenticated;
GRANT ALL ON public.dojo_academy_profile TO service_role;
ALTER TABLE public.dojo_academy_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own academy profile" ON public.dojo_academy_profile;
CREATE POLICY "Owner manages own academy profile"
  ON public.dojo_academy_profile
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_dojo_academy_profile_updated_at ON public.dojo_academy_profile;
CREATE TRIGGER trg_dojo_academy_profile_updated_at
  BEFORE UPDATE ON public.dojo_academy_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Preferências de notificação (1:1 por owner_id)
CREATE TABLE IF NOT EXISTS public.dojo_account_notifications (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  system_enabled boolean NOT NULL DEFAULT true,
  finance_alerts boolean NOT NULL DEFAULT true,
  product_news boolean NOT NULL DEFAULT true,
  reminders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_account_notifications TO authenticated;
GRANT ALL ON public.dojo_account_notifications TO service_role;
ALTER TABLE public.dojo_account_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own notification prefs" ON public.dojo_account_notifications;
CREATE POLICY "Owner manages own notification prefs"
  ON public.dojo_account_notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_dojo_account_notifications_updated_at ON public.dojo_account_notifications;
CREATE TRIGGER trg_dojo_account_notifications_updated_at
  BEFORE UPDATE ON public.dojo_account_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Auditoria de mudanças relevantes na conta
CREATE TABLE IF NOT EXISTS public.dojo_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_account_audit_owner_created
  ON public.dojo_account_audit (owner_id, created_at DESC);

GRANT SELECT, INSERT ON public.dojo_account_audit TO authenticated;
GRANT ALL ON public.dojo_account_audit TO service_role;
ALTER TABLE public.dojo_account_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own audit" ON public.dojo_account_audit;
CREATE POLICY "Owner reads own audit"
  ON public.dojo_account_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner writes own audit" ON public.dojo_account_audit;
CREATE POLICY "Owner writes own audit"
  ON public.dojo_account_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);
