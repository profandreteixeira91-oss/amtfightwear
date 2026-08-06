-- Excluir papéis do usuário
DELETE FROM public.user_roles WHERE user_id = '849815e4-49bc-44f3-bab1-0fd419ee2bfb';

-- Excluir as unidades do dojo onde ele é o dono
DELETE FROM public.dojo_units WHERE owner_id = '849815e4-49bc-44f3-bab1-0fd419ee2bfb';

-- Remover o perfil
DELETE FROM public.profiles WHERE id = '849815e4-49bc-44f3-bab1-0fd419ee2bfb';