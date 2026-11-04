-- Commercial Flow — Fase 3: cadastro único de clientes e oportunidades (CRM).
--
-- Reaproveita as tabelas que já existiam vazias:
--   * public.customers  → cadastro mestre de clientes da loja (telefone normalizado único);
--   * public.crm_deals  → oportunidades do funil comercial (9 etapas).
-- Liga pedidos, orçamentos e chats do site ao cliente (customer_id) e mantém tudo
-- sincronizado por gatilhos que NUNCA bloqueiam um pedido (erro vira aviso no log).
-- Não toca em tabelas dojo_* nem em profiles.
--
-- Para desfazer: ver o bloco "DESFAZER" no fim do arquivo.

-- ---------------------------------------------------------------------------
-- 1) Normalização
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_br_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN d LIKE '55%' AND length(d) BETWEEN 12 AND 13 THEN d
    WHEN length(d) IN (10, 11) THEN '55' || d
    WHEN length(d) >= 12 THEN d
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') AS d) s;
$$;

CREATE OR REPLACE FUNCTION public.normalize_person_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(btrim(regexp_replace(regexp_replace(
    translate(lower(coalesce(p, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')), '');
$$;

-- ---------------------------------------------------------------------------
-- 2) Clientes (public.customers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS email_normalized text,
  ADD COLUMN IF NOT EXISTS name_normalized text,
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS potential text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_order_at timestamptz,
  ADD COLUMN IF NOT EXISTS quotes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- segment (já existia): 'lead' = sem compra · 'novo' = 1 compra · 'recorrente' = 2+.
-- "inativo" é calculado na tela (última compra há mais de 180 dias).
ALTER TABLE public.customers ALTER COLUMN segment SET DEFAULT 'lead';
UPDATE public.customers SET segment = 'lead' WHERE segment = 'new';

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_potential_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_potential_check
  CHECK (potential IS NULL OR potential IN ('baixo', 'medio', 'alto'));

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_normalized_key
  ON public.customers (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_email_normalized_idx ON public.customers (email_normalized);
CREATE INDEX IF NOT EXISTS customers_document_idx ON public.customers (document);
CREATE INDEX IF NOT EXISTS customers_name_normalized_idx ON public.customers (name_normalized);

CREATE OR REPLACE FUNCTION public.customers_normalize()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.phone_normalized := public.normalize_br_phone(NEW.phone);
  NEW.email_normalized := CASE WHEN position('@' IN coalesce(NEW.email, '')) > 0 THEN lower(btrim(NEW.email)) END;
  NEW.name_normalized := public.normalize_person_name(coalesce(nullif(btrim(NEW.company), ''), NEW.full_name));
  NEW.document := nullif(regexp_replace(coalesce(NEW.document, ''), '\D', '', 'g'), '');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS customers_normalize ON public.customers;
CREATE TRIGGER customers_normalize BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_normalize();

-- ---------------------------------------------------------------------------
-- 3) Vínculo com pedidos, orçamentos e chats do site
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.store_quotes
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales_conversations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS store_orders_customer_id_idx ON public.store_orders (customer_id);
CREATE INDEX IF NOT EXISTS store_quotes_customer_id_idx ON public.store_quotes (customer_id);
CREATE INDEX IF NOT EXISTS sales_conversations_customer_id_idx ON public.sales_conversations (customer_id);

/**
 * Encontra (ou cria) o cliente: telefone > e-mail > CPF/CNPJ > nome (só quando não há
 * nenhum contato; essa ligação fica marcada para revisão). Completa dados que faltam,
 * nunca sobrescreve os existentes.
 */
CREATE OR REPLACE FUNCTION public.store_match_customer(
  p_name text, p_email text, p_phone text, p_document text, p_company text, p_origin text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text := public.normalize_br_phone(p_phone);
  v_email text := CASE WHEN position('@' IN coalesce(p_email, '')) > 0 THEN lower(btrim(p_email)) END;
  v_doc text := nullif(regexp_replace(coalesce(p_document, ''), '\D', '', 'g'), '');
  v_company text := nullif(btrim(coalesce(p_company, '')), '');
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_key_name text := public.normalize_person_name(coalesce(v_company, v_name));
  v_id uuid;
  v_existing_phone text;
  v_review boolean := false;
BEGIN
  IF v_doc IS NOT NULL AND length(v_doc) NOT IN (11, 14) THEN v_doc := NULL; END IF;

  IF v_phone IS NOT NULL THEN
    SELECT id INTO v_id FROM public.customers WHERE phone_normalized = v_phone LIMIT 1;
  END IF;
  IF v_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_id FROM public.customers WHERE email_normalized = v_email ORDER BY created_at LIMIT 1;
  END IF;
  IF v_id IS NULL AND v_doc IS NOT NULL THEN
    SELECT id INTO v_id FROM public.customers WHERE document = v_doc ORDER BY created_at LIMIT 1;
  END IF;
  IF v_id IS NULL AND v_phone IS NULL AND v_email IS NULL AND v_doc IS NULL AND v_key_name IS NOT NULL THEN
    SELECT id INTO v_id FROM public.customers WHERE name_normalized = v_key_name ORDER BY created_at LIMIT 1;
    v_review := v_id IS NOT NULL;
  END IF;

  IF v_id IS NULL THEN
    IF v_key_name IS NULL AND v_phone IS NULL AND v_email IS NULL AND v_doc IS NULL THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.customers (full_name, email, phone, document, company, origin, needs_review, segment)
    VALUES (
      coalesce(v_name, v_company, v_email, p_phone, 'Cliente'),
      v_email, CASE WHEN v_phone IS NOT NULL THEN p_phone END, v_doc, v_company, p_origin,
      v_phone IS NULL AND v_email IS NULL AND v_doc IS NULL,
      'lead'
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  SELECT phone_normalized INTO v_existing_phone FROM public.customers WHERE id = v_id;
  -- Mesmo e-mail/documento com outro telefone: pode ser outra pessoa → revisar.
  IF v_phone IS NOT NULL AND v_existing_phone IS NOT NULL AND v_existing_phone <> v_phone THEN
    v_review := true;
  END IF;
  UPDATE public.customers SET
    phone = CASE WHEN phone_normalized IS NULL AND v_phone IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM public.customers c2 WHERE c2.phone_normalized = v_phone)
                 THEN p_phone ELSE phone END,
    email = coalesce(email, v_email),
    document = coalesce(document, v_doc),
    company = coalesce(company, v_company),
    needs_review = needs_review OR v_review
  WHERE id = v_id;
  RETURN v_id;
END $$;

/** Recalcula compras, orçamentos, segmento e último contato do cliente. */
CREATE OR REPLACE FUNCTION public.store_refresh_customer(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_id IS NULL THEN RETURN; END IF;
  UPDATE public.customers c SET
    orders_count = s.n,
    total_spent = s.total,
    first_order_at = s.first,
    last_order_at = s.last,
    quotes_count = (SELECT count(*) FROM public.store_quotes q WHERE q.customer_id = p_id AND q.status <> 'draft'),
    segment = CASE WHEN s.n >= 2 THEN 'recorrente' WHEN s.n = 1 THEN 'novo' ELSE 'lead' END,
    last_contact_at = greatest(
      c.last_contact_at,
      s.last,
      (SELECT max(q.updated_at) FROM public.store_quotes q WHERE q.customer_id = p_id),
      (SELECT max(v.last_message_at) FROM public.sales_conversations v WHERE v.customer_id = p_id)
    )
  FROM (
    SELECT count(*)::int AS n, coalesce(sum(o.total), 0) AS total, min(o.created_at) AS first, max(o.created_at) AS last
    FROM public.store_orders o
    WHERE o.customer_id = p_id
      AND o.payment_status = 'paid'
      AND o.status NOT IN ('cancelled', 'canceled', 'refunded')
  ) s
  WHERE c.id = p_id;
END $$;

-- Gatilhos de vínculo: preenchem customer_id em pedidos, orçamentos e chats novos.
CREATE OR REPLACE FUNCTION public.store_orders_link_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    BEGIN
      -- Pedido gerado por orçamento: é o cliente do orçamento.
      IF NEW.metadata->>'quote_id' IS NOT NULL THEN
        SELECT q.customer_id INTO NEW.customer_id FROM public.store_quotes q WHERE q.id::text = NEW.metadata->>'quote_id';
      END IF;
      IF NEW.customer_id IS NULL THEN
        NEW.customer_id := public.store_match_customer(
          NEW.customer_name, NEW.customer_email, NEW.customer_phone, NEW.customer_document, NULL,
          CASE WHEN NEW.metadata->>'channel' = 'quote' THEN 'orcamento' ELSE 'loja' END);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'store_orders_link_customer: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.store_quotes_link_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL AND NEW.status <> 'draft' THEN
    BEGIN
      NEW.customer_id := public.store_match_customer(
        NEW.customer_name, NEW.customer_email, NEW.customer_phone, NEW.customer_document, NEW.customer_company, 'orcamento');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'store_quotes_link_customer: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sales_conversations_link_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL AND (NEW.customer_email IS NOT NULL OR NEW.customer_phone IS NOT NULL) THEN
    BEGIN
      NEW.customer_id := public.store_match_customer(
        NEW.customer_name, NEW.customer_email, NEW.customer_phone, NULL, NULL, 'chat_site');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'sales_conversations_link_customer: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

-- Recalcula o cliente quando um pedido/orçamento/chat dele muda.
CREATE OR REPLACE FUNCTION public.store_refresh_customer_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM public.store_refresh_customer(OLD.customer_id);
    ELSE
      PERFORM public.store_refresh_customer(NEW.customer_id);
      IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
        PERFORM public.store_refresh_customer(OLD.customer_id);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'store_refresh_customer_trigger: %', SQLERRM;
  END;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS store_orders_link_customer ON public.store_orders;
CREATE TRIGGER store_orders_link_customer
  BEFORE INSERT OR UPDATE OF customer_name, customer_email, customer_phone, customer_document ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.store_orders_link_customer();
DROP TRIGGER IF EXISTS store_orders_refresh_customer ON public.store_orders;
CREATE TRIGGER store_orders_refresh_customer
  AFTER INSERT OR DELETE OR UPDATE OF customer_id, status, payment_status, total ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.store_refresh_customer_trigger();

DROP TRIGGER IF EXISTS store_quotes_link_customer ON public.store_quotes;
CREATE TRIGGER store_quotes_link_customer
  BEFORE INSERT OR UPDATE OF customer_name, customer_email, customer_phone, customer_document, customer_company, status ON public.store_quotes
  FOR EACH ROW EXECUTE FUNCTION public.store_quotes_link_customer();
DROP TRIGGER IF EXISTS store_quotes_refresh_customer ON public.store_quotes;
CREATE TRIGGER store_quotes_refresh_customer
  AFTER INSERT OR DELETE OR UPDATE OF customer_id, status ON public.store_quotes
  FOR EACH ROW EXECUTE FUNCTION public.store_refresh_customer_trigger();

DROP TRIGGER IF EXISTS sales_conversations_link_customer ON public.sales_conversations;
CREATE TRIGGER sales_conversations_link_customer
  BEFORE INSERT OR UPDATE OF customer_name, customer_email, customer_phone ON public.sales_conversations
  FOR EACH ROW EXECUTE FUNCTION public.sales_conversations_link_customer();
DROP TRIGGER IF EXISTS sales_conversations_refresh_customer ON public.sales_conversations;
CREATE TRIGGER sales_conversations_refresh_customer
  AFTER INSERT OR UPDATE OF customer_id, last_message_at ON public.sales_conversations
  FOR EACH ROW EXECUTE FUNCTION public.store_refresh_customer_trigger();

-- ---------------------------------------------------------------------------
-- 4) Oportunidades (public.crm_deals) — funil de 9 etapas
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS product_interest text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at date,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.store_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Etapas antigas (lead/qualified/proposal/won/lost) → novas.
ALTER TABLE public.crm_deals DROP CONSTRAINT IF EXISTS crm_deals_stage_check;
UPDATE public.crm_deals SET stage = CASE stage
  WHEN 'lead' THEN 'novo_contato' WHEN 'qualified' THEN 'necessidade'
  WHEN 'proposal' THEN 'orcamento_enviado' WHEN 'won' THEN 'ganho' WHEN 'lost' THEN 'perdido'
  ELSE stage END;
ALTER TABLE public.crm_deals ALTER COLUMN stage SET DEFAULT 'novo_contato';
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_stage_check CHECK (stage IN (
  'novo_contato', 'em_atendimento', 'necessidade', 'orcamento_preparacao', 'orcamento_enviado',
  'negociacao', 'aguardando_pagamento', 'ganho', 'perdido'));
CREATE INDEX IF NOT EXISTS crm_deals_customer_id_idx ON public.crm_deals (customer_id);
CREATE INDEX IF NOT EXISTS crm_deals_quote_id_idx ON public.crm_deals (quote_id);

-- Data da mudança de etapa e do fechamento.
CREATE OR REPLACE FUNCTION public.crm_deals_stage_dates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
    NEW.closed_at := CASE WHEN NEW.stage IN ('ganho', 'perdido') THEN coalesce(NEW.closed_at, now()) END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_deals_stage_dates ON public.crm_deals;
CREATE TRIGGER crm_deals_stage_dates BEFORE INSERT OR UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_deals_stage_dates();

-- O status do orçamento vinculado move a oportunidade (sem voltar etapas fechadas).
CREATE OR REPLACE FUNCTION public.crm_deals_follow_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stage text := CASE NEW.status
    WHEN 'sent' THEN 'orcamento_enviado'
    WHEN 'approved' THEN 'aguardando_pagamento'
    WHEN 'paid_50' THEN 'ganho'
    WHEN 'paid_100' THEN 'ganho'
    WHEN 'rejected' THEN 'perdido'
    WHEN 'expired' THEN 'perdido'
  END;
BEGIN
  IF v_stage IS NULL THEN RETURN NULL; END IF;
  BEGIN
    UPDATE public.crm_deals d SET
      stage = v_stage,
      lost_reason = CASE WHEN v_stage = 'perdido' THEN coalesce(d.lost_reason,
        CASE NEW.status WHEN 'rejected' THEN 'Orçamento recusado' ELSE 'Orçamento expirado' END) ELSE d.lost_reason END,
      order_id = coalesce(d.order_id,
        (SELECT o.id FROM public.store_orders o WHERE o.metadata->>'quote_id' = NEW.id::text ORDER BY o.created_at LIMIT 1)),
      value = CASE WHEN coalesce(d.value, 0) = 0 THEN coalesce(NEW.total, 0) ELSE d.value END
    WHERE d.quote_id = NEW.id AND d.stage NOT IN ('ganho', 'perdido') AND d.stage IS DISTINCT FROM v_stage;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm_deals_follow_quote: %', SQLERRM;
  END;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS crm_deals_follow_quote ON public.store_quotes;
CREATE TRIGGER crm_deals_follow_quote AFTER UPDATE OF status ON public.store_quotes
  FOR EACH ROW EXECUTE FUNCTION public.crm_deals_follow_quote();

-- ---------------------------------------------------------------------------
-- 5) Acesso: só o dono da loja (eram abertas a qualquer conta logada)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth read customers" ON public.customers;
DROP POLICY IF EXISTS "Auth write customers" ON public.customers;
DROP POLICY IF EXISTS "Auth update customers" ON public.customers;
DROP POLICY IF EXISTS "Auth delete customers" ON public.customers;
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.customers;
CREATE POLICY "Dono da loja gerencia" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));

DROP POLICY IF EXISTS "Auth read deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Auth write deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Auth update deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Auth delete deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.crm_deals;
CREATE POLICY "Dono da loja gerencia" ON public.crm_deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.store_match_customer(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_refresh_customer(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Importação dos dados existentes (pedidos → orçamentos → chats)
--    Os gatilhos de "atualizado em" ficam desligados durante a importação, para não
--    mexer nas datas que a Central Comercial usa (follow-up, entrega a confirmar).
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_orders DISABLE TRIGGER USER;
ALTER TABLE public.store_quotes DISABLE TRIGGER USER;
ALTER TABLE public.sales_conversations DISABLE TRIGGER USER;

DO $$
DECLARE r record;
BEGIN
  -- 1º pedidos da loja (melhores dados de contato); os gerados por orçamento ficam para depois.
  FOR r IN SELECT * FROM public.store_orders
           WHERE customer_id IS NULL AND metadata->>'quote_id' IS NULL ORDER BY created_at LOOP
    UPDATE public.store_orders SET customer_id = public.store_match_customer(
      r.customer_name, r.customer_email, r.customer_phone, r.customer_document, NULL, 'loja')
    WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT * FROM public.store_quotes WHERE customer_id IS NULL AND status <> 'draft' ORDER BY created_at LOOP
    UPDATE public.store_quotes SET customer_id = public.store_match_customer(
      r.customer_name, r.customer_email, r.customer_phone, r.customer_document, r.customer_company, 'orcamento')
    WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT * FROM public.sales_conversations
           WHERE customer_id IS NULL AND (customer_email IS NOT NULL OR customer_phone IS NOT NULL)
           ORDER BY created_at LOOP
    UPDATE public.sales_conversations SET customer_id = public.store_match_customer(
      r.customer_name, r.customer_email, r.customer_phone, NULL, NULL, 'chat_site')
    WHERE id = r.id;
  END LOOP;
  -- Pedido gerado por orçamento herda o cliente do orçamento.
  UPDATE public.store_orders o SET customer_id = q.customer_id
  FROM public.store_quotes q
  WHERE o.customer_id IS NULL AND o.metadata->>'quote_id' = q.id::text AND q.customer_id IS NOT NULL;
  -- Sobra (orçamento apagado ou sem contato): liga pelos dados do próprio pedido.
  FOR r IN SELECT * FROM public.store_orders WHERE customer_id IS NULL ORDER BY created_at LOOP
    UPDATE public.store_orders SET customer_id = public.store_match_customer(
      r.customer_name, r.customer_email, r.customer_phone, r.customer_document, NULL, 'orcamento')
    WHERE id = r.id;
  END LOOP;

  PERFORM public.store_refresh_customer(c.id) FROM public.customers c;
END $$;

ALTER TABLE public.store_orders ENABLE TRIGGER USER;
ALTER TABLE public.store_quotes ENABLE TRIGGER USER;
ALTER TABLE public.sales_conversations ENABLE TRIGGER USER;

-- Conferência: clientes criados, a revisar, e vínculos.
SELECT
  (SELECT count(*) FROM public.customers) AS clientes,
  (SELECT count(*) FROM public.customers WHERE needs_review) AS clientes_a_revisar,
  (SELECT count(*) FROM public.customers WHERE segment = 'recorrente') AS recorrentes,
  (SELECT count(*) FROM public.store_orders WHERE customer_id IS NOT NULL) AS pedidos_ligados,
  (SELECT count(*) FROM public.store_orders) AS pedidos,
  (SELECT count(*) FROM public.store_quotes WHERE customer_id IS NOT NULL) AS orcamentos_ligados,
  (SELECT count(*) FROM public.store_quotes WHERE status <> 'draft') AS orcamentos;

-- ---------------------------------------------------------------------------
-- DESFAZER (rodar manualmente se precisar voltar):
--   DROP TRIGGER IF EXISTS crm_deals_follow_quote ON public.store_quotes;
--   DROP TRIGGER IF EXISTS store_orders_link_customer ON public.store_orders;
--   DROP TRIGGER IF EXISTS store_orders_refresh_customer ON public.store_orders;
--   DROP TRIGGER IF EXISTS store_quotes_link_customer ON public.store_quotes;
--   DROP TRIGGER IF EXISTS store_quotes_refresh_customer ON public.store_quotes;
--   DROP TRIGGER IF EXISTS sales_conversations_link_customer ON public.sales_conversations;
--   DROP TRIGGER IF EXISTS sales_conversations_refresh_customer ON public.sales_conversations;
--   ALTER TABLE public.store_orders DROP COLUMN IF EXISTS customer_id;
--   ALTER TABLE public.store_quotes DROP COLUMN IF EXISTS customer_id;
--   ALTER TABLE public.sales_conversations DROP COLUMN IF EXISTS customer_id;
--   DELETE FROM public.customers;  -- estava vazia antes desta migration
-- ---------------------------------------------------------------------------
