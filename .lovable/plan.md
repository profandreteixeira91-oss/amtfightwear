# Agente IA de Vendas — AMT SalesBot

## Objetivo
Um vendedor consultivo com IA que atende o cliente final em 3 canais (widget no site, WhatsApp e Instagram Direct), usa o catálogo real da AMT como fonte de verdade, tira dúvidas de produto/tamanho, monta o carrinho e **entrega ao cliente um link direto para o checkout da loja amtfightwear.com.br já com os itens adicionados** — sem processar pagamento dentro do MarketEngine.

## Onde entra no menu
Novo grupo na sidebar: **SalesBot** com 4 telas:
1. **Conversas** — inbox unificado de todas as conversas (site + WA + IG), estilo bandeja
2. **Base de conhecimento** — políticas de venda, FAQ, regras de frete/troca, cupons ativos
3. **Configurações do agente** — tom, autonomia, mensagem inicial por canal, on/off por canal
4. **Analytics de vendas** — funil (conversa → carrinho → link → venda), taxa de conversão, ticket médio, produtos mais recomendados

## Arquitetura

```text
                   ┌──────────────────────────┐
   Widget do site  │                          │
   (embed em      ─┤                          │
   amtfightwear)   │                          │
                   │   /api/public/sales/chat │──► Lovable AI Gateway
   WhatsApp    ───►│   (server route, SSE)    │    (google/gemini-3-flash-preview)
   webhook Meta    │                          │            │
                   │                          │            ▼
   IG Direct   ───►│                          │      tool calling
   webhook Meta    │                          │      (5 ferramentas)
                   └──────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────────┐
                  │  Supabase (RLS)          │
                  │  sales_conversations     │
                  │  sales_messages          │
                  │  sales_carts             │
                  │  sales_cart_items        │
                  │  sales_kb_articles       │
                  │  sales_agent_settings    │
                  └──────────────────────────┘
```

Um único **cérebro** (server route com AI SDK) atende os 3 canais. O canal só muda como a mensagem chega e como o link do carrinho é entregue de volta.

## Ferramentas do agente (tool calling)

| Ferramenta | O que faz |
|---|---|
| `search_catalog` | Busca produtos por texto/categoria/faixa de preço na tabela `products` (usa embeddings se disponível, senão trigram) |
| `get_product_details` | Retorna nome, preço, descrição, imagem, tamanhos, `source_url` de 1 produto |
| `add_to_cart` | Adiciona item ao `sales_cart` da conversa ativa |
| `remove_from_cart` / `view_cart` | Gerencia carrinho |
| `generate_checkout_link` | Monta URL do checkout de amtfightwear.com.br com os itens, retorna para o agente enviar ao cliente |
| `lookup_kb` | Consulta `sales_kb_articles` (frete, troca, entrega, tamanhos, forma de pagamento) |

Autonomia = **consultivo puro**: sem cupom, sem desconto. Só recomenda, informa e monta carrinho.

## Checkout — link para amtfightwear.com.br
A loja é WooCommerce (padrão brasileiro). O link de carrinho pré-preenchido usa a query string nativa:
```
https://www.amtfightwear.com.br/carrinho/?add-to-cart=<ID>&quantity=<N>
```
Para múltiplos itens, o agente gera links sequenciais ou usa o formato `?add-to-cart=123,456&quantity=1,2` (WooCommerce Multiple Add-to-Cart). A coluna `source_url` já existe em `products` — precisaremos armazenar também o `wc_product_id` (nova coluna) sincronizado no scraper do catálogo.

## Multicanal — entrega da mensagem

**1. Widget do site (`/embed/salesbot.js`)**
- Script leve que injeta um chat flutuante em qualquer página de amtfightwear.com.br
- Envia mensagens para `/api/public/sales/chat` com `channel=web` + `visitor_id` (cookie)
- Renderiza cards de produto + botão "Ver na loja" quando o agente chama `get_product_details`

**2. WhatsApp (WhatsApp Cloud API — Meta)**
- Webhook `/api/public/hooks/whatsapp` recebe mensagens
- Mesma engine responde e envia via Graph API (`/messages` com template `text`)
- Cards de produto viram mensagens com imagem + legenda + link
- Requer novo secret `WHATSAPP_PHONE_NUMBER_ID` + escopo `whatsapp_business_messaging` no app Meta que já está conectado

**3. Instagram Direct**
- Já temos conexão Meta. Adicionar webhook de `messages` no app + escopo `instagram_manage_messages`
- Webhook `/api/public/hooks/instagram-dm` reaproveita o mesmo engine
- Regra da Meta: só responde dentro da janela de 24h após o cliente iniciar contato (a fila do piloto de outreach já cobre a iniciação)

## Modelo de dados (novas tabelas)

```text
sales_conversations
  id, channel ('web'|'whatsapp'|'instagram'), external_id (wa_id/ig_user_id/visitor_id),
  customer_name, customer_phone, customer_email, status ('open'|'closed'|'converted'),
  last_message_at, created_at

sales_messages
  id, conversation_id, role ('user'|'assistant'|'tool'), parts (jsonb — UIMessage),
  created_at

sales_carts
  id, conversation_id, checkout_url, status ('active'|'sent'|'purchased'|'abandoned'),
  total_estimate, created_at, updated_at

sales_cart_items
  id, cart_id, product_id, quantity, size, unit_price

sales_kb_articles
  id, title, body_md, tags[], is_active

sales_agent_settings
  id, tone, greeting_web, greeting_wa, greeting_ig,
  channel_web_enabled, channel_wa_enabled, channel_ig_enabled,
  business_hours_json, offline_message

products  (adicionar coluna)
  wc_product_id integer  -- id do produto no WooCommerce da loja
```

Todas com RLS: leitura/escrita apenas pelo `service_role` das rotas públicas + leitura para `authenticated` (admin do MarketEngine vê o inbox).

## Fluxo típico de conversa
1. Cliente: "Vocês têm kimono trançado infantil azul?"
2. Agente chama `search_catalog({ query: "kimono trançado infantil", color: "azul" })` → 3 produtos
3. Responde com card do melhor match + pergunta a idade/altura
4. Cliente: "9 anos, 1,35m"
5. Agente recomenda tamanho A2, chama `add_to_cart` + `generate_checkout_link`
6. Envia: "Deixei pronto pra você: [Ir para o checkout →](link)"
7. Ao completar compra no site, o webhook do WooCommerce (se configurado) marca `sales_carts.status = 'purchased'` — senão fica em `sent` e o analytics estima pela conversão declarada

## Roadmap de implementação (fases)

**Fase A — Núcleo do agente + Widget web (MVP)**
- Migration das 6 tabelas + coluna `wc_product_id`
- Server route `POST /api/public/sales/chat` com AI SDK + tools
- Script embed `/salesbot-widget.js` (React standalone, ~30kb) + iframe/pop-up
- Telas: Conversas + Configurações do agente
- Inbox realtime via Supabase Realtime

**Fase B — WhatsApp Cloud API**
- Setup do WhatsApp Business no app Meta existente (guia passo-a-passo)
- Webhook `/api/public/hooks/whatsapp` (verificação + POST)
- Envio outbound via Graph API com cards de produto

**Fase C — Instagram Direct**
- Adicionar escopo `instagram_manage_messages` na conexão Meta
- Webhook `/api/public/hooks/instagram-dm`
- Reuso do engine

**Fase D — Analytics + KB**
- Tela de Base de Conhecimento (CRUD de artigos)
- Tela de Analytics (funil, ticket médio, top produtos)
- Webhook opcional do WooCommerce para marcar compras

## Detalhes técnicos
- **IA**: `google/gemini-3-flash-preview` via `createLovableAiGatewayProvider`, tools com `stopWhen: stepCountIs(50)`
- **Streaming**: `streamText` + `toUIMessageStreamResponse` no widget web; render texto simples para WA/IG
- **Segurança rotas públicas**: rate-limit por `external_id` (10 msgs/min), validação Zod, verificação de assinatura HMAC nos webhooks Meta (`X-Hub-Signature-256`)
- **Persistência**: `onFinish` grava `UIMessage[]` completo em `sales_messages`
- **Sincronização do catálogo**: estender o scraper existente para gravar `wc_product_id` extraído da página do produto (`<link rel="shortlink" href=".../?p=ID">`)
- **Anti-alucinação**: prompt do sistema proíbe inventar preço/estoque/prazo — se `search_catalog` retorna vazio, agente diz "não localizei esse item, quer que eu chame o time humano?"

## Fora do escopo (não faremos nesta rodada)
- Processar pagamento dentro do MarketEngine (usa checkout da loja)
- Cupons/descontos automáticos
- Aprovação humana antes de fechar (autonomia total)
- Voz/áudio no atendimento

## Confirmação necessária antes de codar
1. OK começar pela **Fase A** (widget web) e deixar WA/IG para as fases B/C?
2. Confirma que a loja aceita `?add-to-cart=ID&quantity=N` (WooCommerce padrão)? Se for outra plataforma, o formato do link muda.
