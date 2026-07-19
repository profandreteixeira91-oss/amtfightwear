# Módulo AMT Store no AMT Dojo Manager

Cria um "shopping" completo dentro do Dojo Manager que consome o **próprio catálogo já existente** da loja AMT Fight Wear (tabelas `products`, `store_categories`, `store_product_variants`, `store_orders`, etc.) através de uma **camada de API interna versionada** — de modo que, se amanhã a loja for migrada, basta trocar o adaptador.

Nada de dados mockados. Tudo multi-tenant por `academy_owner_id`.

---

## 1. Arquitetura

```text
Dojo Manager UI (/dojo/app/store/*)
        │
        ▼
Adapter: src/lib/dojo/store/*.functions.ts   ← createServerFn (RPC tipada)
        │
        ▼
StoreProvider interface (src/lib/dojo/store/provider.ts)
        │
        ├── LocalAmtProvider  → lê `products`, `store_*` do próprio Supabase
        └── (futuro) RemoteHttpProvider → REST autenticado por API key
```

O UI **nunca** fala com as tabelas da loja diretamente. Sempre passa pelas server functions, que passam pelo provider. Trocar de plataforma = trocar 1 arquivo.

## 2. Banco de dados (migração única)

Novas tabelas (todas com `owner_id uuid` + RLS por `auth.uid()` e GRANTs):

- `dojo_store_favorites` — favoritos por academia, agrupados em listas (`list_name`).
- `dojo_store_favorite_lists` — Reposição, Uniformes, Faixas, Competições…
- `dojo_store_carts` — 1 carrinho ativo por academia (`owner_id` unique).
- `dojo_store_cart_items` — `product_id`, `variant_id`, `qty`, `customization jsonb`, `student_id` (opcional — compra p/ aluno).
- `dojo_store_orders` — espelho do pedido criado no fluxo da loja + `owner_id`, `origin='dojo_manager'`, `status`, `totals`, `retail_total`, `wholesale_total`, `savings`, `tracking_code`, `invoice_url`.
- `dojo_store_order_items` — itens do pedido com `student_id`, `customization`, preços aplicados.
- `dojo_store_order_timeline` — linha do tempo (evento, autor, timestamp).
- `dojo_store_student_deliveries` — vincula item entregue a `dojo_students.id` (histórico de kimono/faixa/patch por aluno).
- `dojo_store_sync_logs` — última sync, contagens, erros.

**Não duplico** produtos/preços/estoque — leio direto das tabelas `products`, `store_product_variants` etc. via provider. `store_orders` continua sendo a fonte da verdade do pedido; `dojo_store_orders` é o link tenant → pedido da loja.

Regra de atacado (sem cupom): configurável em `app_settings` (`wholesale_min_qty_per_product` = 6 por padrão, `wholesale_min_order_value` = 1000). Aplicada no servidor ao recalcular o carrinho.

## 3. Server functions (`src/lib/dojo/store/*.functions.ts`)

Todas com `requireSupabaseAuth` e escopadas por `get_my_student_owner_id`-equivalente para dono do dojo:

- `listCategories`, `listProducts({ category, search, filters, sort, page })`, `getProduct(slug)`
- `listFeatured`, `listNew`, `listPromos`
- `getCart`, `addToCart`, `updateCartItem`, `removeCartItem`, `clearCart`
- `applyCoupon`, `computeTotals` (retorna varejo vs atacado + economia)
- `checkout({ payment_method, shipping })` → cria pedido em `store_orders` (Mercado Pago já configurado) + registro em `dojo_store_orders`
- `listOrders`, `getOrder(id)`, `reorder(id)`
- `listFavorites`, `toggleFavorite`, `createFavoriteList`
- `getDashboardKpis` (pedidos, gasto no mês, economia, top produtos)
- `getRecommendations` (mais comprados + reposição sugerida por histórico)
- `runSync()` + `getLastSync()` — atualiza `dojo_store_sync_logs`. Como o provider atual lê direto do banco, sync = contagem/checksum. Já preparado para virar HTTP fetch.
- `attachItemsToStudents({ order_id, assignments })` — grava em `dojo_store_student_deliveries`

## 4. Rotas UI (todas em `src/routes/_authenticated/dojo.app.store.*`)

```text
dojo.app.store.tsx                  (layout com top-nav do módulo)
dojo.app.store.index.tsx            → Dashboard
dojo.app.store.produtos.tsx         → Catálogo com filtros
dojo.app.store.produtos.$slug.tsx   → PDP (com botão Personalizar / Comprar / Favoritar / Compartilhar)
dojo.app.store.faixas.tsx           (atalhos de categoria — reutilizam Catálogo com filtro fixo)
dojo.app.store.kimonos.tsx
dojo.app.store.patches.tsx
dojo.app.store.rashguards.tsx
dojo.app.store.vestuario.tsx
dojo.app.store.carrinho.tsx         → Carrinho + resumo atacado/varejo
dojo.app.store.pedidos.tsx          → Lista
dojo.app.store.pedidos.$id.tsx      → Detalhe + timeline + "Comprar novamente" + "Atribuir a alunos"
dojo.app.store.favoritos.tsx        → Listas
dojo.app.store.configuracoes.tsx    → Sync + preferências
```

O menu superior do Dojo (`AppTopNav.tsx`) ganha o item **AMT Store** com dropdown para os submenus pedidos.

## 5. UX

- Visual e-commerce (Nike/Decathlon), reusando os tokens do design system atual do Dojo.
- Card do produto: badge automático **"Preço atacado desbloqueado"** quando a qty do carrinho para aquele produto ≥ mínimo.
- Carrinho mostra 2 colunas de subtotal: **Varejo** riscado × **Seu preço (atacado)** + linha **Você economizou R$ X**.
- Personalização abre o mesmo configurador já existente em `/loja/custom-shop` (extraído para componente reutilizável `<CustomShopConfigurator />`) e persiste `customization` no item.
- Checkout usa o mesmo fluxo Mercado Pago já implementado (`src/lib/store/mercadopago.functions.ts`) — apenas marca `origin='dojo_manager'` no `store_orders`.
- Notificações in-app já existentes (`dojo_account_notifications` / `NotificationsBell`) recebem eventos de mudança de status. Hooks para push/WhatsApp/email ficam como interface preparada, sem envio real.

## 6. Compra para alunos (arquitetura, sem cobrança automática ainda)

Na tela do pedido, ação **"Atribuir aos alunos"** abre modal com multi-seleção de `dojo_students`. Grava em `dojo_store_student_deliveries` e mostra no perfil do aluno o histórico. A cobrança pelo Financeiro fica como TODO documentado (não implementado nesta entrega, mas o campo `billable_to_student boolean` já vai no schema).

## 7. Segurança

- Todas as tabelas novas com RLS `owner_id = auth.uid()` + GRANTs para `authenticated` e `service_role`.
- `checkout` executa como usuário (RLS aplica); server valida totais recalculando no backend — nunca confia no valor vindo do cliente.
- Provider remoto (futuro) autenticaria com API key + HMAC.

## 8. Escopo desta entrega

Incluído: menu, dashboard, catálogo completo, PDP, carrinho com atacado automático, checkout via Mercado Pago existente, pedidos com timeline, favoritos com listas, "comprar novamente", vínculo com alunos, sync log, tela de sincronização.

Fora de escopo (só arquitetura/campos prontos): cobrança automática pelo Financeiro, cashback, assinaturas, marketplace, push/WhatsApp/email. Documentados como extension points.

## 9. Critérios de aceite mapeados

- Catálogo oficial dentro do Dojo Manager ✅ (via provider lendo `products`)
- Sync automática ✅ (log + botão manual; provider local = tempo real)
- Atacado automático ✅ (server recalcula)
- Varejo + atacado no mesmo fluxo ✅
- Personalização integrada ✅ (configurador reusado)
- Pedidos gravados em `store_orders` da loja oficial ✅
- Arquitetura modular / troca de backend sem reescrita ✅ (interface `StoreProvider`)

---

Se aprovar, começo pela migração + provider + rotas de catálogo/carrinho, depois checkout/pedidos/favoritos/dashboard.