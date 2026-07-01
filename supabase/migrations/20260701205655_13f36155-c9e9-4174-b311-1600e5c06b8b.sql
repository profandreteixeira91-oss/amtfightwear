
-- SalesBot: conversas, mensagens, carrinhos, KB, configurações
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wc_product_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_products_wc_product_id ON public.products(wc_product_id) WHERE wc_product_id IS NOT NULL;

-- 1) Conversas
CREATE TABLE public.sales_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('web','whatsapp','instagram')),
  external_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','converted','abandoned')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);
GRANT SELECT ON public.sales_conversations TO authenticated;
GRANT ALL ON public.sales_conversations TO service_role;
ALTER TABLE public.sales_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sales_conversations" ON public.sales_conversations FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_sales_conversations_updated BEFORE UPDATE ON public.sales_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sales_conversations_last ON public.sales_conversations(last_message_at DESC);

-- 2) Mensagens (uma linha por parte da UIMessage também é ok; guardamos a UIMessage inteira)
CREATE TABLE public.sales_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.sales_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales_messages TO authenticated;
GRANT ALL ON public.sales_messages TO service_role;
ALTER TABLE public.sales_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sales_messages" ON public.sales_messages FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_sales_messages_conv ON public.sales_messages(conversation_id, created_at);

-- 3) Carrinhos
CREATE TABLE public.sales_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.sales_conversations(id) ON DELETE CASCADE,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sent','purchased','abandoned')),
  total_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales_carts TO authenticated;
GRANT ALL ON public.sales_carts TO service_role;
ALTER TABLE public.sales_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sales_carts" ON public.sales_carts FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_sales_carts_updated BEFORE UPDATE ON public.sales_carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sales_carts_conv ON public.sales_carts(conversation_id);

-- 4) Itens do carrinho
CREATE TABLE public.sales_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.sales_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size TEXT,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wc_product_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales_cart_items TO authenticated;
GRANT ALL ON public.sales_cart_items TO service_role;
ALTER TABLE public.sales_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sales_cart_items" ON public.sales_cart_items FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_sales_cart_items_cart ON public.sales_cart_items(cart_id);

-- 5) Base de conhecimento
CREATE TABLE public.sales_kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_kb_articles TO authenticated;
GRANT ALL ON public.sales_kb_articles TO service_role;
ALTER TABLE public.sales_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage kb" ON public.sales_kb_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_kb_updated BEFORE UPDATE ON public.sales_kb_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Configurações do agente (linha única)
CREATE TABLE public.sales_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tone TEXT NOT NULL DEFAULT 'consultivo, cordial, direto',
  greeting_web TEXT NOT NULL DEFAULT 'Olá! Sou o assistente da AMT Fight Wear. Como posso te ajudar a encontrar o produto ideal?',
  greeting_wa TEXT NOT NULL DEFAULT 'Olá! Sou o assistente da AMT Fight Wear. Em que posso ajudar hoje?',
  greeting_ig TEXT NOT NULL DEFAULT 'Olá! Sou o assistente da AMT Fight Wear. Em que posso ajudar?',
  channel_web_enabled BOOLEAN NOT NULL DEFAULT true,
  channel_wa_enabled BOOLEAN NOT NULL DEFAULT false,
  channel_ig_enabled BOOLEAN NOT NULL DEFAULT false,
  business_hours_json JSONB NOT NULL DEFAULT '{"tz":"America/Sao_Paulo","always_on":true}'::jsonb,
  offline_message TEXT NOT NULL DEFAULT 'Estamos fora do horário de atendimento. Deixe sua mensagem que retornaremos em breve.',
  site_url TEXT NOT NULL DEFAULT 'https://www.amtfightwear.com.br',
  cart_url_template TEXT NOT NULL DEFAULT 'https://www.amtfightwear.com.br/carrinho/?add-to-cart={ids}&quantity={qtys}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sales_agent_settings TO authenticated;
GRANT ALL ON public.sales_agent_settings TO service_role;
ALTER TABLE public.sales_agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage sales_agent_settings" ON public.sales_agent_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sales_agent_settings_updated BEFORE UPDATE ON public.sales_agent_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.sales_agent_settings (id) VALUES (gen_random_uuid());
