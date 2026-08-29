CREATE TABLE public.dojo_staff_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,
  auth_user_id uuid,
  email text NOT NULL,
  full_name text,
  role text,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_staff_accounts TO authenticated;
GRANT ALL ON public.dojo_staff_accounts TO service_role;

ALTER TABLE public.dojo_staff_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono do dojo gerencia contas da equipe"
  ON public.dojo_staff_accounts FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Colaborador le a propria conta"
  ON public.dojo_staff_accounts FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE UNIQUE INDEX dojo_staff_accounts_member_key ON public.dojo_staff_accounts (member_id);
CREATE UNIQUE INDEX dojo_staff_accounts_user_owner_key ON public.dojo_staff_accounts (auth_user_id, owner_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX dojo_staff_accounts_owner_idx ON public.dojo_staff_accounts (owner_id);
CREATE INDEX dojo_staff_accounts_email_idx ON public.dojo_staff_accounts (lower(email));

CREATE OR REPLACE FUNCTION public.dojo_staff_accounts_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dojo_staff_accounts_updated_at
  BEFORE UPDATE ON public.dojo_staff_accounts
  FOR EACH ROW EXECUTE FUNCTION public.dojo_staff_accounts_touch();

-- Sessão do Portal da Equipe: lida exclusivamente da base de equipe.
CREATE OR REPLACE FUNCTION public.dojo_staff_session()
RETURNS TABLE (
  account_id uuid,
  member_id uuid,
  owner_id uuid,
  role text,
  full_name text,
  email text,
  status text,
  permissions jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,
         a.member_id,
         a.owner_id,
         COALESCE(m.role, a.role),
         COALESCE(m.full_name, a.full_name),
         a.email,
         a.status,
         COALESCE(m.permissions, '{}'::jsonb)
    FROM public.dojo_staff_accounts a
    LEFT JOIN public.dojo_team_members m ON m.id = a.member_id
   WHERE a.auth_user_id = auth.uid()
     AND a.status = 'active'
   ORDER BY a.created_at
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.dojo_staff_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dojo_staff_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dojo_staff_session() TO service_role;

-- Identidade pública do dojo para a tela de login da equipe (por ID ou slug).
CREATE OR REPLACE FUNCTION public.get_dojo_staff_portal(_dojo text)
RETURNS TABLE (
  owner_id uuid,
  slug text,
  trade_name text,
  legal_name text,
  logo_url text,
  brand_primary text,
  brand_secondary text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.owner_id, p.slug, p.trade_name, p.legal_name, p.logo_url,
         p.brand_primary, p.brand_secondary, p.city, p.state
    FROM public.dojo_academy_profile p
   WHERE p.slug = _dojo
      OR (_dojo ~ '^[0-9a-fA-F-]{36}$' AND p.owner_id = _dojo::uuid)
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_dojo_staff_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dojo_staff_portal(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dojo_staff_portal(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dojo_staff_portal(text) TO service_role;