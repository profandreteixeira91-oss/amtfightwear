-- Isolamento entre academias: remove o bypass do admin da plataforma das
-- policies RLS das tabelas de dados das academias (dojo_*).
--
-- O dono do SaaS (amt_admin) não herda acesso a dados de tenants — no painel do
-- Dojo ele é só mais um dono de academia (ver is-saas-owner.ts no amtdojomanager).
-- O /admin lê dados das academias pelo servidor, com service role, que não
-- depende destas policies.
--
-- Lê pg_policies AO VIVO (o banco tem policies criadas fora das migrations) e
-- troca has_role(auth.uid(), 'amt_admin' | 'admin') por false. Como `X OR false`
-- = X, dono, aluno e equipe mantêm exatamente o mesmo acesso.
--
-- Ficam de fora (o admin da plataforma precisa delas pelo cliente logado):
--   - tabelas da relação AMT ↔ academia: suporte (o /admin abre e responde
--     chamados), assinaturas (realtime do /admin), AMT Pay/split, documentos de
--     onboarding e histórico de gateway;
--   - o catálogo global de faixas (owner_id IS NULL AND amt_admin), que é
--     conteúdo da AMT e não dado de academia.

DO $$
DECLARE
  pat CONSTANT text := '(public\.)?has_role\(auth\.uid\(\), ''(amt_admin|admin)''::(public\.)?app_role\)';
  platform_tables CONSTANT text[] := ARRAY[
    'dojo_support_tickets',
    'dojo_support_messages',
    'dojo_subscriptions',
    'dojo_split_config',
    'dojo_split_transactions',
    'dojo_onboarding_documents',
    'dojo_gateway_history'
  ];
  r record;
  new_qual text;
  new_check text;
  role_list text;
  stmt text;
  n int := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename LIKE 'dojo\_%'
      AND tablename <> ALL (platform_tables)
      AND (COALESCE(qual, '') ~ pat OR COALESCE(with_check, '') ~ pat)
      AND COALESCE(qual, '') NOT LIKE '%owner_id IS NULL) AND %'
  LOOP
    new_qual := regexp_replace(r.qual, pat, 'false', 'g');
    new_check := regexp_replace(r.with_check, pat, 'false', 'g');
    SELECT string_agg(quote_ident(x), ', ') INTO role_list FROM unnest(r.roles) AS x;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd, role_list);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;
    EXECUTE stmt;
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'Policies dojo_* sem bypass de admin: % reescritas', n;

  -- Autoverificação: se sobrou qualquer bypass em tabela de academia, desfaz tudo.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename LIKE 'dojo\_%'
      AND tablename <> ALL (platform_tables)
      AND (COALESCE(qual, '') ~ pat OR COALESCE(with_check, '') ~ pat)
      AND COALESCE(qual, '') NOT LIKE '%owner_id IS NULL) AND %'
  ) THEN
    RAISE EXCEPTION 'Ainda há policies dojo_* com bypass de admin — migration desfeita';
  END IF;
END $$;
