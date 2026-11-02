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

-- 1) Remove as policies abertas
DROP POLICY IF EXISTS "Authenticated can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "Auth delete customers" ON public.customers;
DROP POLICY IF EXISTS "Auth read customers" ON public.customers;
DROP POLICY IF EXISTS "Auth update customers" ON public.customers;
DROP POLICY IF EXISTS "Auth write customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated manage sequence_runs" ON public.email_sequence_runs;
DROP POLICY IF EXISTS "Authenticated manage email_sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "authed read webhook logs" ON public.ig_webhook_log;
DROP POLICY IF EXISTS "authenticated all lead_enrichments" ON public.lead_enrichments;
DROP POLICY IF EXISTS "authenticated all lead_exports" ON public.lead_exports;
DROP POLICY IF EXISTS "authenticated all lead_history" ON public.lead_history;
DROP POLICY IF EXISTS "Authenticated can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can update leads" ON public.leads;
DROP POLICY IF EXISTS "Auth delete price_research" ON public.price_research;
DROP POLICY IF EXISTS "Auth read price_research" ON public.price_research;
DROP POLICY IF EXISTS "Auth update price_research" ON public.price_research;
DROP POLICY IF EXISTS "Auth write price_research" ON public.price_research;
DROP POLICY IF EXISTS "Auth delete price_suggestions" ON public.price_suggestions;
DROP POLICY IF EXISTS "Auth read price_suggestions" ON public.price_suggestions;
DROP POLICY IF EXISTS "Auth update price_suggestions" ON public.price_suggestions;
DROP POLICY IF EXISTS "Auth write price_suggestions" ON public.price_suggestions;
DROP POLICY IF EXISTS "Auth delete products" ON public.products;
DROP POLICY IF EXISTS "Auth read products" ON public.products;
DROP POLICY IF EXISTS "Auth update products" ON public.products;
DROP POLICY IF EXISTS "Auth write products" ON public.products;
DROP POLICY IF EXISTS "Authenticated manage sales_agent_settings" ON public.sales_agent_settings;
DROP POLICY IF EXISTS "Authenticated read sales_cart_items" ON public.sales_cart_items;
DROP POLICY IF EXISTS "Authenticated read sales_carts" ON public.sales_carts;
DROP POLICY IF EXISTS "Authenticated read sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Authenticated manage kb" ON public.sales_kb_articles;
DROP POLICY IF EXISTS "Authenticated read sales_messages" ON public.sales_messages;
DROP POLICY IF EXISTS "Auth full access categories" ON public.store_categories;
DROP POLICY IF EXISTS "Team can manage store finance entries" ON public.store_finance_entries;
DROP POLICY IF EXISTS "Auth access import jobs" ON public.store_import_jobs;
DROP POLICY IF EXISTS "Auth manage order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Auth manage orders" ON public.store_orders;
DROP POLICY IF EXISTS "Auth full access product images" ON public.store_product_images;
DROP POLICY IF EXISTS "Auth full access variants" ON public.store_product_variants;
DROP POLICY IF EXISTS "Team can manage production comments" ON public.store_production_comments;
DROP POLICY IF EXISTS "Team can manage production queue" ON public.store_production_jobs;
DROP POLICY IF EXISTS "Team can manage production stage events" ON public.store_production_stage_events;
DROP POLICY IF EXISTS "Authenticated can manage shipping settings" ON public.store_shipping_settings;
DROP POLICY IF EXISTS "Authenticated can read shipping settings" ON public.store_shipping_settings;

-- 2) Dono da loja gerencia tudo nessas tabelas
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.app_settings;
CREATE POLICY "Dono da loja gerencia" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.customers;
CREATE POLICY "Dono da loja gerencia" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.email_sequence_runs;
CREATE POLICY "Dono da loja gerencia" ON public.email_sequence_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.email_sequences;
CREATE POLICY "Dono da loja gerencia" ON public.email_sequences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.ig_webhook_log;
CREATE POLICY "Dono da loja gerencia" ON public.ig_webhook_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.lead_enrichments;
CREATE POLICY "Dono da loja gerencia" ON public.lead_enrichments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.lead_exports;
CREATE POLICY "Dono da loja gerencia" ON public.lead_exports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.lead_history;
CREATE POLICY "Dono da loja gerencia" ON public.lead_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.leads;
CREATE POLICY "Dono da loja gerencia" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.price_research;
CREATE POLICY "Dono da loja gerencia" ON public.price_research FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.price_suggestions;
CREATE POLICY "Dono da loja gerencia" ON public.price_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.products;
CREATE POLICY "Dono da loja gerencia" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_agent_settings;
CREATE POLICY "Dono da loja gerencia" ON public.sales_agent_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_cart_items;
CREATE POLICY "Dono da loja gerencia" ON public.sales_cart_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_carts;
CREATE POLICY "Dono da loja gerencia" ON public.sales_carts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_conversations;
CREATE POLICY "Dono da loja gerencia" ON public.sales_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_kb_articles;
CREATE POLICY "Dono da loja gerencia" ON public.sales_kb_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.sales_messages;
CREATE POLICY "Dono da loja gerencia" ON public.sales_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_categories;
CREATE POLICY "Dono da loja gerencia" ON public.store_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_finance_entries;
CREATE POLICY "Dono da loja gerencia" ON public.store_finance_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_import_jobs;
CREATE POLICY "Dono da loja gerencia" ON public.store_import_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_order_items;
CREATE POLICY "Dono da loja gerencia" ON public.store_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_orders;
CREATE POLICY "Dono da loja gerencia" ON public.store_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_product_images;
CREATE POLICY "Dono da loja gerencia" ON public.store_product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_product_variants;
CREATE POLICY "Dono da loja gerencia" ON public.store_product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_production_comments;
CREATE POLICY "Dono da loja gerencia" ON public.store_production_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_production_jobs;
CREATE POLICY "Dono da loja gerencia" ON public.store_production_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_production_stage_events;
CREATE POLICY "Dono da loja gerencia" ON public.store_production_stage_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.store_shipping_settings;
CREATE POLICY "Dono da loja gerencia" ON public.store_shipping_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));

-- 3) Vitrine: cliente logado (e aluno/academia na loja do Dojo) lê o que o visitante já lê
DROP POLICY IF EXISTS "Logados leem produtos ativos" ON public.products;
CREATE POLICY "Logados leem produtos ativos" ON public.products FOR SELECT TO authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Logados leem categorias ativas" ON public.store_categories;
CREATE POLICY "Logados leem categorias ativas" ON public.store_categories FOR SELECT TO authenticated
  USING (active = true);
DROP POLICY IF EXISTS "Logados leem variantes ativas" ON public.store_product_variants;
CREATE POLICY "Logados leem variantes ativas" ON public.store_product_variants FOR SELECT TO authenticated
  USING (active = true AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));
DROP POLICY IF EXISTS "Logados leem imagens de produtos ativos" ON public.store_product_images;
CREATE POLICY "Logados leem imagens de produtos ativos" ON public.store_product_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

-- 4) Regras de atacado são exibidas ao cliente: leitura pública só dessa chave
DROP POLICY IF EXISTS "Leitura pública das regras de atacado" ON public.app_settings;
CREATE POLICY "Leitura pública das regras de atacado" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = 'wholesale_settings');
