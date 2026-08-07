-- 1. Enum para papéis lógicos (dojo_users)
DO $$ BEGIN
    CREATE TYPE public.dojo_user_role AS ENUM ('owner', 'admin', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Nova tabela para identidades administrativas lógicas (Contexto Dojo Manager)
CREATE TABLE IF NOT EXISTS public.dojo_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL, -- O tenant (dojo) ao qual esta identidade pertence
    role public.dojo_user_role NOT NULL DEFAULT 'owner',
    name TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (auth_user_id, owner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_users TO authenticated;
GRANT ALL ON public.dojo_users TO service_role;
ALTER TABLE public.dojo_users ENABLE ROW LEVEL SECURITY;

-- 3. Nova tabela para contextos de acesso de alunos
CREATE TABLE IF NOT EXISTS public.student_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    first_access_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (auth_user_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_accounts TO authenticated;
GRANT ALL ON public.student_accounts TO service_role;
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

-- RLS para dojo_users: o dono da identidade ou o dono do dojo podem ler/gerenciar
DROP POLICY IF EXISTS "Users read own identities" ON public.dojo_users;
CREATE POLICY "Users read own identities" ON public.dojo_users 
    FOR SELECT TO authenticated USING (auth_user_id = auth.uid() OR owner_id = auth.uid());

-- RLS para student_accounts: o aluno dono da conta pode ler
DROP POLICY IF EXISTS "Students read own accounts" ON public.student_accounts;
CREATE POLICY "Students read own accounts" ON public.student_accounts
    FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- 4. Migração de Dados Iniciais
-- Criar dojo_users para todos os perfis de academia existentes (donos)
INSERT INTO public.dojo_users (auth_user_id, owner_id, role, email)
SELECT owner_id, owner_id, 'owner', (SELECT email FROM auth.users WHERE id = owner_id)
FROM public.dojo_academy_profile
ON CONFLICT (auth_user_id, owner_id) DO NOTHING;

-- Criar student_accounts para todos os alunos vinculados a um user_id
INSERT INTO public.student_accounts (auth_user_id, student_id, email)
SELECT user_id, id, email
FROM public.dojo_students
WHERE user_id IS NOT NULL
ON CONFLICT (auth_user_id, student_id) DO NOTHING;