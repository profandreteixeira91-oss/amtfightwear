
-- 1. Expand dojo_units
ALTER TABLE public.dojo_units
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS state_registration text,
  ADD COLUMN IF NOT EXISTS opened_at date,
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS manager_cpf text,
  ADD COLUMN IF NOT EXISTS manager_rg text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS socials jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS facade_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS modalities text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS age_ranges text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS coordinator_ids uuid[] DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS admin_ids uuid[] DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. dojo_unit_members
CREATE TABLE IF NOT EXISTS public.dojo_unit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.dojo_units(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','professor','instrutor','recepcao','financeiro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_dojo_unit_members_owner ON public.dojo_unit_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_unit_members_user ON public.dojo_unit_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_unit_members TO authenticated;
GRANT ALL ON public.dojo_unit_members TO service_role;
ALTER TABLE public.dojo_unit_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own unit members"
  ON public.dojo_unit_members FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users read own memberships"
  ON public.dojo_unit_members FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_dojo_unit_members_updated ON public.dojo_unit_members;
CREATE TRIGGER trg_dojo_unit_members_updated
  BEFORE UPDATE ON public.dojo_unit_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. has_unit_access helper
CREATE OR REPLACE FUNCTION public.has_unit_access(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dojo_units u WHERE u.id = _unit_id AND u.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.dojo_unit_members m WHERE m.unit_id = _unit_id AND m.user_id = _user_id
  );
$$;

-- 4. Add unit_id to missing tables
ALTER TABLE public.dojo_certificates ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL;
ALTER TABLE public.dojo_graduations ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL;
ALTER TABLE public.dojo_sales ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL;

-- 5. Make student_id nullable in dojo_certificates (allow affiliate certificates)
ALTER TABLE public.dojo_certificates ALTER COLUMN student_id DROP NOT NULL;
