-- Deletar papéis de usuário
DELETE FROM public.user_roles WHERE user_id IN ('6a82e542-618e-44fd-ba0a-b09d9836f9b7', '4cdfce89-3a38-415f-9565-e705bc0e4429');

-- Deletar registros de alunos (Cascade cuidará de dependências se configurado, mas limpamos o principal)
DELETE FROM public.dojo_students WHERE email IN ('camila.souza@example.com', 'amy.borm@gmail.com');

-- Deletar usuários do Auth (Isso disparará deleções em cascata em perfis e outras tabelas vinculadas por FK)
DELETE FROM auth.users WHERE id IN ('6a82e542-618e-44fd-ba0a-b09d9836f9b7', '4cdfce89-3a38-415f-9565-e705bc0e4429');