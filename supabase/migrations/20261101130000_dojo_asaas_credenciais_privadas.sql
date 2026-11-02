-- AMT Pay (Asaas, modelo subconta): a API key da subconta de cada academia
-- sai de dojo_academy_profile — que alunos e equipe do dojo conseguem ler pela
-- RLS (branding) — e passa a ficar numa tabela que só o servidor (service
-- role) acessa: RLS ligada, sem nenhuma policy e sem grants para anon/authenticated.

CREATE TABLE IF NOT EXISTS public.dojo_asaas_credentials (
  owner_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dojo_asaas_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dojo_asaas_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.dojo_asaas_credentials TO service_role;

-- Move chaves que já estejam no perfil e limpa a coluna exposta.
INSERT INTO public.dojo_asaas_credentials (owner_id, api_key)
SELECT owner_id, asaas_api_key_encrypted
  FROM public.dojo_academy_profile
 WHERE asaas_api_key_encrypted IS NOT NULL AND btrim(asaas_api_key_encrypted) <> ''
ON CONFLICT (owner_id) DO NOTHING;

UPDATE public.dojo_academy_profile
   SET asaas_api_key_encrypted = NULL
 WHERE asaas_api_key_encrypted IS NOT NULL;

COMMENT ON COLUMN public.dojo_academy_profile.asaas_api_key_encrypted IS
  'Obsoleta: a API key da subconta fica em dojo_asaas_credentials (só service role). Manter nula.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dojo_asaas_credentials') THEN
    RAISE EXCEPTION 'dojo_asaas_credentials não pode ter policies — migration desfeita';
  END IF;
  IF has_table_privilege('authenticated', 'public.dojo_asaas_credentials', 'SELECT')
     OR has_table_privilege('anon', 'public.dojo_asaas_credentials', 'SELECT') THEN
    RAISE EXCEPTION 'dojo_asaas_credentials legível por anon/authenticated — migration desfeita';
  END IF;
END $$;
