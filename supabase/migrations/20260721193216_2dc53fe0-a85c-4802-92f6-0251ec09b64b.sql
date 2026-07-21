
-- 1) Garantir papéis para o admin correto (prof. andre)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'profandreteixeira91@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'amt_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'profandreteixeira91@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Limpar dados vinculados ao e-mail amy.borm@gmail.com
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'amy.borm@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Registros de dojo owned by amy
  DELETE FROM public.dojo_students WHERE owner_id = v_uid OR user_id = v_uid;
  DELETE FROM public.dojo_academy_profile WHERE owner_id = v_uid;
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
END $$;
