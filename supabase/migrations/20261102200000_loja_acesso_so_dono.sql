-- Central da loja: só o dono acessa os dados internos da loja.
--
-- O login (Supabase Auth) é compartilhado com o Dojo Manager e com os clientes da loja.
-- Estas tabelas tinham policies abertas a QUALQUER usuário logado (USING (true) /
-- auth.uid() IS NOT NULL): um aluno ou cliente podia ler e alterar pedidos, produtos,
-- clientes, leads, atendimento, produção e configurações direto pela API.
--
-- Agora: escrita e dados internos = só quem tem o papel amt_admin (o dono da loja).
-- Continuam valendo as policies de cliente ("Own orders read", notificações próprias) e
-- as leituras públicas da vitrine (produtos, categorias, variantes e imagens ATIVOS).
-- O servidor (service_role) não passa por RLS e segue funcionando.
--
-- Tabela que não existe no banco é pulada (nem toda migration antiga foi aplicada).
-- Pode rodar de novo sem problema.

DO $$
DECLARE
  p record;
  t text;
  dono constant text := 'public.has_role(auth.uid(), ''amt_admin''::public.app_role)';
BEGIN
  -- 1) Remove as policies abertas
  FOR p IN SELECT * FROM (VALUES
      ('app_settings', 'Authenticated can insert settings'),
      ('app_settings', 'Authenticated can read settings'),
      ('app_settings', 'Authenticated can update settings'),
      ('customers', 'Auth delete customers'),
      ('customers', 'Auth read customers'),
      ('customers', 'Auth update customers'),
      ('customers', 'Auth write customers'),
      ('email_sequence_runs', 'Authenticated manage sequence_runs'),
      ('email_sequences', 'Authenticated manage email_sequences'),
      ('ig_webhook_log', 'authed read webhook logs'),
      ('lead_enrichments', 'authenticated all lead_enrichments'),
      ('lead_exports', 'authenticated all lead_exports'),
      ('lead_history', 'authenticated all lead_history'),
      ('leads', 'Authenticated can delete leads'),
      ('leads', 'Authenticated can insert leads'),
      ('leads', 'Authenticated can read leads'),
      ('leads', 'Authenticated can update leads'),
      ('price_research', 'Auth delete price_research'),
      ('price_research', 'Auth read price_research'),
      ('price_research', 'Auth update price_research'),
      ('price_research', 'Auth write price_research'),
      ('price_suggestions', 'Auth delete price_suggestions'),
      ('price_suggestions', 'Auth read price_suggestions'),
      ('price_suggestions', 'Auth update price_suggestions'),
      ('price_suggestions', 'Auth write price_suggestions'),
      ('products', 'Auth delete products'),
      ('products', 'Auth read products'),
      ('products', 'Auth update products'),
      ('products', 'Auth write products'),
      ('sales_agent_settings', 'Authenticated manage sales_agent_settings'),
      ('sales_cart_items', 'Authenticated read sales_cart_items'),
      ('sales_carts', 'Authenticated read sales_carts'),
      ('sales_conversations', 'Authenticated read sales_conversations'),
      ('sales_kb_articles', 'Authenticated manage kb'),
      ('sales_messages', 'Authenticated read sales_messages'),
      ('store_categories', 'Auth full access categories'),
      ('store_finance_entries', 'Team can manage store finance entries'),
      ('store_import_jobs', 'Auth access import jobs'),
      ('store_order_items', 'Auth manage order items'),
      ('store_orders', 'Auth manage orders'),
      ('store_product_images', 'Auth full access product images'),
      ('store_product_variants', 'Auth full access variants'),
      ('store_production_comments', 'Team can manage production comments'),
      ('store_production_jobs', 'Team can manage production queue'),
      ('store_production_stage_events', 'Team can manage production stage events'),
      ('store_shipping_settings', 'Authenticated can manage shipping settings'),
      ('store_shipping_settings', 'Authenticated can read shipping settings')
    ) AS v(tbl, pol)
  LOOP
    IF to_regclass('public.' || p.tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.pol, p.tbl);
    END IF;
  END LOOP;

  -- 2) Dono da loja gerencia tudo nessas tabelas
  FOREACH t IN ARRAY ARRAY['app_settings', 'customers', 'email_sequence_runs', 'email_sequences', 'ig_webhook_log', 'lead_enrichments', 'lead_exports', 'lead_history', 'leads', 'price_research', 'price_suggestions', 'products', 'sales_agent_settings', 'sales_cart_items', 'sales_carts', 'sales_conversations', 'sales_kb_articles', 'sales_messages', 'store_categories', 'store_finance_entries', 'store_import_jobs', 'store_order_items', 'store_orders', 'store_product_images', 'store_product_variants', 'store_production_comments', 'store_production_jobs', 'store_production_stage_events', 'store_shipping_settings']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Dono da loja gerencia', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
        'Dono da loja gerencia', t, dono, dono);
    ELSE
      RAISE NOTICE 'Tabela public.% não existe, pulada', t;
    END IF;
  END LOOP;

  -- 3) Vitrine: cliente logado (e aluno/academia na loja do Dojo) lê o que o visitante já lê
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Logados leem produtos ativos" ON public.products;
    CREATE POLICY "Logados leem produtos ativos" ON public.products FOR SELECT TO authenticated
      USING (status = 'active');
  END IF;
  IF to_regclass('public.store_categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Logados leem categorias ativas" ON public.store_categories;
    CREATE POLICY "Logados leem categorias ativas" ON public.store_categories FOR SELECT TO authenticated
      USING (active = true);
  END IF;
  IF to_regclass('public.store_product_variants') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Logados leem variantes ativas" ON public.store_product_variants;
    CREATE POLICY "Logados leem variantes ativas" ON public.store_product_variants FOR SELECT TO authenticated
      USING (active = true AND EXISTS (SELECT 1 FROM public.products pr WHERE pr.id = product_id AND pr.status = 'active'));
  END IF;
  IF to_regclass('public.store_product_images') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Logados leem imagens de produtos ativos" ON public.store_product_images;
    CREATE POLICY "Logados leem imagens de produtos ativos" ON public.store_product_images FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.products pr WHERE pr.id = product_id AND pr.status = 'active'));
  END IF;

  -- 4) Regras de atacado são exibidas ao cliente: leitura pública só dessa chave
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Leitura pública das regras de atacado" ON public.app_settings;
    CREATE POLICY "Leitura pública das regras de atacado" ON public.app_settings FOR SELECT TO anon, authenticated
      USING (key = 'wholesale_settings');
  END IF;
END $$;

-- 5) Conferência: policies ainda abertas a qualquer logado/anônimo nas tabelas da loja.
--    O esperado é nenhuma linha (fora as duas públicas de propósito: tamanhos e visitas).
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename ~ '^(store_|products|product_|app_settings|sales_|customer|profiles|price_|prospect|leads?|ig_|instagram|ads_|meta_|marketing|fiscal|nfe|invoices?$|email_|suppressed|scheduled_posts|user_roles)'
  AND NOT (tablename = 'store_size_presets' AND policyname = 'Anyone can read size presets')
  AND NOT (tablename = 'store_visits' AND policyname = 'Anyone can log a visit')
  AND (
    coalesce(qual, '') IN ('true', '(true)') OR coalesce(with_check, '') IN ('true', '(true)')
    OR coalesce(qual, '') ILIKE '%auth.uid() IS NOT NULL%' OR coalesce(with_check, '') ILIKE '%auth.uid() IS NOT NULL%'
    OR coalesce(qual, '') ILIKE '%auth.role()%authenticated%' OR coalesce(with_check, '') ILIKE '%auth.role()%authenticated%'
  )
ORDER BY tablename, policyname;
