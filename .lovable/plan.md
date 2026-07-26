
# Central Administrativa AMT — rota única `/admin`

Uma central única, exclusiva do owner, que reúne a administração da **AMT Fight Wear** (loja) e do **AMT Dojo Manager** (SaaS) sob a mesma casca visual, o mesmo guard e o mesmo ponto de edição. Sem duplicar telas: as páginas existentes são reaproveitadas como filhas do novo layout.

## Estrutura de rotas

```text
src/routes/_authenticated/
  admin.tsx                       ← layout raiz da central (OwnerOnly + shell)
  admin.index.tsx                 ← /admin  (visão geral: KPIs loja + KPIs dojo)

  admin.store.tsx                 ← sub-layout Fight Wear
  admin.store.index.tsx           ← /admin/store              (dashboard loja)
  admin.store.products.tsx        ← /admin/store/products
  admin.store.orders.tsx          ← /admin/store/orders
  admin.store.customers.tsx       ← /admin/store/customers
  admin.store.wholesale.tsx       ← /admin/store/wholesale
  admin.store.shipping.tsx        ← /admin/store/shipping
  admin.store.sizes.tsx           ← /admin/store/sizes
  admin.store.faixa-calc.tsx      ← /admin/store/faixa-calc
  admin.store.imagens.tsx         ← /admin/store/imagens
  admin.store.import.tsx          ← /admin/store/import
  admin.store.chat.tsx            ← /admin/store/chat
  admin.store.notifications.tsx   ← /admin/store/notifications

  admin.dojo.tsx                  ← sub-layout Dojo Manager (visão owner-global)
  admin.dojo.index.tsx            ← /admin/dojo   (métricas SaaS: MRR, dojos ativos, churn)
  admin.dojo.tenants.tsx          ← lista de dojos/tenants
  admin.dojo.tenants.$id.tsx      ← detalhe/impersonation de um dojo
  admin.dojo.subscriptions.tsx    ← assinaturas e faturas globais
  admin.dojo.payouts.tsx          ← AMT Pay: splits, saques, taxas
  admin.dojo.support.tsx          ← suporte cross-tenant

  admin.growth.tsx                ← Marketing/Growth Engine (já owner-only)
```

O que **não** muda:
- Rotas públicas da loja (`/loja/*`) e do dojo (`/dojo/app/*` para cada tenant) permanecem intocadas.
- Nenhum tenant do Dojo Manager perde acesso à sua própria administração — a central é sobre o **ecossistema**, não substitui o painel de cada academia.

## Shell da central (`admin.tsx`)

Um único ponto de edição controla o visual e as permissões da central inteira:

- **Guard**: `<OwnerOnly>` — bloqueia qualquer não-owner antes do `<Outlet />`.
- **Sidebar shadcn (`collapsible="icon"`)** com dois grupos:
  - **AMT Fight Wear**: Dashboard, Produtos, Pedidos, Clientes, Atacado, Frete, Tamanhos, Faixa Calc, Imagens, Importação, Chat, Notificações.
  - **AMT Dojo Manager**: Visão SaaS, Dojos, Assinaturas, AMT Pay, Suporte.
  - **Growth**: Growth Engine.
- **Header** com breadcrumb do módulo ativo, seletor rápido "Loja ↔ Dojo", busca global, avatar + logout.
- **Trigger visível** (hamburguer) para colapsar/expandir a sidebar em desktop e abrir off-canvas no mobile.
- **Tema**: fundo claro SaaS (padrão adotado no `/store`), com acento vermelho AMT nos indicadores de módulo.

## Migração sem quebrar links existentes

1. As páginas atuais em `_authenticated/store.*.tsx` continuam existindo até o corte final.
2. Cada nova rota `admin.store.*.tsx` **re-exporta o componente** da tela original — nada de código duplicado.
3. Adicionamos **redirects permanentes** `/store/*` → `/admin/store/*` via `beforeLoad` no layout `store.tsx` existente, para que qualquer bookmark, link interno ou histórico continue funcionando enquanto os `<Link>` internos migram.
4. As mesmas técnicas para o admin do Dojo (o que hoje é global, não por tenant) e para `/growth`.
5. Depois de auditar todos os `<Link>` internos, removemos os arquivos antigos.

## Página `/admin` (visão geral do ecossistema)

Cards KPI premium (padrão Stripe/Linear) agregando dois mundos:

- **Fight Wear**: receita 30d, pedidos hoje, ticket médio, produtos com estoque crítico, visitantes online.
- **Dojo Manager**: MRR, dojos ativos, novos tenants 30d, trial→pago (%), receita AMT Pay (2% split).
- **Atividade recente unificada**: pedidos, novos dojos, matrículas, saques, tudo em um feed.

Cada card leva ao módulo correspondente com `<Link preload="intent">`.

## Segurança e isolamento

- Guard único no layout — sem checagens duplicadas nas telas filhas.
- **Nenhuma quebra do multi-tenant**: a central lê dados agregados via server functions dedicadas (`adminGetEcosystemOverview`, `adminListTenants`) que rodam com role owner e **jamais expõem dados de um tenant para outro no painel do próprio tenant**.
- Server functions novas seguem o padrão `.middleware([requireSupabaseAuth])` + verificação de owner (`OWNER_EMAIL`) dentro do handler antes de qualquer leitura cross-tenant.

## Detalhes técnicos

- `admin.tsx` monta `SidebarProvider` + `AppSidebar` + `<Outlet />` (shadcn Sidebar guidance).
- Cada sub-layout (`admin.store.tsx`, `admin.dojo.tsx`) apenas renderiza `<Outlet />` — servem como pontos de extensão futuros (loaders compartilhados, tabs de contexto).
- `AppTopNav` deixa de tratar `/store/*` — a central assume esse chrome. `AppTopNav` continua exclusivo do fluxo Dojo por-tenant.
- Novas server functions em `src/lib/admin/ecosystem.functions.ts` para KPIs agregados.
- `getIsOwner()` server-side reaproveitado em cada handler cross-tenant para defesa em profundidade além do RLS.

## Entrega em fases

**Fase 1 — Fundação (esta rodada, se aprovado)**
- Criar `admin.tsx` com shell (sidebar, header, guard).
- Criar `admin.index.tsx` com placeholder de KPIs agregados.
- Criar `admin.store.tsx` + re-exports das 13 telas existentes da loja.
- Redirect `/store/*` → `/admin/store/*`.
- Item de menu no `AppTopNav` (área dojo) apontando para `/admin` quando o usuário é owner.

**Fase 2 — Ecossistema Dojo**
- Criar `admin.dojo.*` (SaaS view: tenants, assinaturas, AMT Pay global, suporte).
- Server functions agregadas + KPIs reais no `/admin`.
- Feed de atividade unificado.

**Fase 3 — Limpeza**
- Migrar todos os `<Link>` internos para `/admin/*`.
- Remover arquivos antigos `_authenticated/store.*.tsx` (redirects permanecem).
- Auditoria de acessibilidade e mobile da sidebar.

## Riscos e mitigação

- **Links quebrados**: mitigado por redirects permanentes na Fase 1.
- **Confusão com painel do tenant**: a central usa `/admin`, o painel do dono do dojo continua em `/dojo/app`. Copy da UI reforça: "Central AMT" vs "Meu Dojo".
- **Vazamento cross-tenant**: server functions cross-tenant só executam após checagem explícita de owner; testes unitários cobrindo negação para não-owner.

---

Aprovando este plano, começo pela **Fase 1** já nesta rodada.
