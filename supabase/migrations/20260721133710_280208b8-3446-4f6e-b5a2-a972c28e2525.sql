-- Permissões & Acessos: coluna JSONB em dojo_team_members e função para vincular usuário por e-mail
ALTER TABLE public.dojo_team_members
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Função SECURITY DEFINER para vincular team_member à conta auth.users pelo e-mail
-- Apenas o próprio owner pode executar (verificação explícita).
CREATE OR REPLACE FUNCTION public.dojo_link_team_member_by_email(
  _member_id UUID,
  _email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner UUID;
  v_user  UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT owner_id INTO v_owner FROM public.dojo_team_members WHERE id = _member_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para vincular este colaborador';
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado com esse e-mail. Peça que o colaborador se cadastre em /dojo/auth primeiro.';
  END IF;

  UPDATE public.dojo_team_members
     SET user_id = v_user, updated_at = now()
   WHERE id = _member_id;

  RETURN v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.dojo_link_team_member_by_email(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dojo_link_team_member_by_email(UUID, TEXT) TO authenticated;

-- Função helper para o cliente ler as próprias permissões (pelo user_id)
CREATE OR REPLACE FUNCTION public.dojo_my_team_permissions()
RETURNS TABLE (
  member_id UUID,
  owner_id UUID,
  role TEXT,
  full_name TEXT,
  permissions JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, owner_id, role, full_name, permissions
    FROM public.dojo_team_members
   WHERE user_id = auth.uid()
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.dojo_my_team_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dojo_my_team_permissions() TO authenticated;