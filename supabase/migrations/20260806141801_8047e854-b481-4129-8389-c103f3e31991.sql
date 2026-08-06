-- Criar função para excluir conta de dono de dojo de forma segura (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_dojo_owner(owner_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem chama é admin ou amt_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'amt_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Remover matriculas ligadas aos planos das unidades deste dono
  DELETE FROM public.dojo_enrollments 
  WHERE plan_id IN (
    SELECT id FROM public.dojo_plans 
    WHERE unit_id IN (SELECT id FROM public.dojo_units WHERE owner_id = owner_id_to_delete)
  );

  -- 2. Remover planos
  DELETE FROM public.dojo_plans 
  WHERE unit_id IN (SELECT id FROM public.dojo_units WHERE owner_id = owner_id_to_delete);

  -- 3. Remover unidades
  DELETE FROM public.dojo_units 
  WHERE owner_id = owner_id_to_delete;

  -- 4. Remover assinaturas SaaS
  DELETE FROM public.dojo_subscriptions 
  WHERE owner_id = owner_id_to_delete;

  -- 5. Remover papéis do usuário
  DELETE FROM public.user_roles 
  WHERE user_id = owner_id_to_delete;

  -- 6. Remover perfil (profiles)
  DELETE FROM public.profiles 
  WHERE id = owner_id_to_delete;

  -- Nota: O usuário no auth.users permanece (não deletável via SQL puro em SECURITY DEFINER facilmente sem privilégios extras no schema auth),
  -- mas ele perde todo o acesso e dados do Dojo Manager.
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_dojo_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_dojo_owner(uuid) TO service_role;