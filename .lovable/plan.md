# Central Administrativa AMT — Unificação sob `/admin/*`

## Escopo

Refatoração **estrutural** (URLs + shell + navegação). Sem tocar em regras de negócio, APIs, banco, permissões ou funcionalidades. Cada rota atual continua funcionando (via redirect) até que todos os `<Link>` internos sejam migrados.

## Estratégia (para não quebrar 100+ rotas de uma vez)

Fazer via **camada de aliases** em vez de renomear arquivos:

1. **Um shell único** (`AdminShell`) — o que já existe hoje em `/store` e `/growth` — passa a envolver TODAS as áreas administrativas (Fight Wear, Growth, Dojo Manager, Ads, Instagram, Prospect, Market, Users, Logs, Settings, Dashboard).
2. **Rotas canônicas em `/admin/*`** — cada módulo administrativo ganha uma rota física sob `src/routes/_authenticated/admin.<slug>.tsx` que **re-exporta o componente do arquivo original** (import direto, mesma tela, mesma lógica, mesmos loaders).
3. **Rotas antigas viram redirects** — cada arquivo legado (`store.orders.tsx`, `dojo.app.students.tsx`, etc.) passa a executar `beforeLoad → redirect({ to: "/admin/..."} )`. Sem apagar arquivos, sem quebrar bookmarks/PWA (o redirect leva o usuário à nova URL automaticamente).
4. **Sidebar única** organizada em grupos (Dashboard, Comercial, Marketing, Vendas, Financeiro, Fight Wear, Dojo Manager, Sistema).
5. **Busca global** (`⌘K`) implementada uma vez no `AdminShell`.

Isso preserva integralmente APIs, permissões e URLs externas (via 302 client-side), mudando apenas a arquitetura visível.

## Mapa de URLs (canônico → arquivo legado que redireciona)

```text
Dashboard
  /admin                        ← admin.index.tsx (já existe)
  /admin/dashboard              ← dashboard.tsx

Comercial
  /admin/leads                  ← prospect.leads.tsx
  /admin/leads/qualificados     ← prospect.qualified.tsx
  /admin/leads/pipeline         ← prospect.pipeline.tsx
  /admin/leads/busca            ← prospect.search.tsx
  /admin/leads/macro            ← prospect.macro.tsx
  /admin/leads/logs             ← prospect.logs.tsx
  /admin/leads/settings         ← prospect.settings.tsx
  /admin/leads/:id              ← prospect.$id.tsx
  /admin/crm                    ← growth.crm.tsx
  /admin/clientes               ← store.customers.tsx  (+ growth.customers.tsx merge)
  /admin/atendimento            ← store.chat.tsx

Marketing
  /admin/instagram/*            ← instagram.*
  /admin/anuncios/*             ← ads.*
  /admin/marketing/insights     ← growth.insights.tsx
  /admin/marketing/intelligence ← growth.intelligence.tsx
  /admin/marketing/kpis         ← growth.kpis.tsx
  /admin/marketing/mercado      ← growth.market.tsx / market.*

Vendas (Fight Wear)
  /admin/pedidos                ← store.orders.tsx
  /admin/produtos               ← store.products.tsx
  /admin/produtos/imagens       ← store.imagens.tsx
  /admin/produtos/importar      ← store.import.tsx
  /admin/produtos/tamanhos      ← store.sizes.tsx
  /admin/produtos/faixa-calc    ← store.faixa-calc.tsx
  /admin/atacado                ← store.wholesale.tsx
  /admin/envio                  ← store.shipping.tsx
  /admin/loja                   ← store.index.tsx

Dojo Manager
  /admin/dojo                    ← dojo.app.index.tsx
  /admin/dojo/alunos             ← dojo.app.students.*
  /admin/dojo/equipe             ← dojo.app.team.*
  /admin/dojo/graduacoes         ← dojo.app.graduations.tsx
  /admin/dojo/faixas             ← dojo.app.belts.tsx
  /admin/dojo/faixas/studio      ← dojo.app.belt-studio.tsx
  /admin/dojo/certificados       ← dojo.app.certificates.tsx
  /admin/dojo/avaliacoes/*       ← dojo.app.evaluations.*
  /admin/dojo/planos-de-aula/*   ← dojo.app.lesson-plans.*
  /admin/dojo/competicoes/*      ← dojo.app.competitions.*
  /admin/dojo/contratos/*        ← dojo.app.contracts.* + contract-templates.*
  /admin/dojo/agenda             ← dojo.app.schedule.tsx
  /admin/dojo/planos             ← dojo.app.plans.tsx
  /admin/dojo/vendas             ← dojo.app.sales.tsx
  /admin/dojo/financeiro         ← dojo.app.finance.tsx
  /admin/dojo/ranking            ← dojo.app.ranking.tsx
  /admin/dojo/checkin            ← dojo.app.checkin.tsx
  /admin/dojo/comunicados        ← dojo.app.announcements.tsx
  /admin/dojo/notificacoes       ← dojo.app.notifications.tsx
  /admin/dojo/integracoes        ← dojo.app.integrations.tsx
  /admin/dojo/loja               ← dojo.app.store.*
  /admin/dojo/conta              ← dojo.app.account.tsx
  /admin/dojo/beneficios         ← dojo.app.corporate-benefits.tsx
  /admin/dojo/apk                ← dojo.app.apk-versions.tsx
  /admin/dojo/qr-aluno           ← dojo.app.student-app-qr.tsx

Sistema
  /admin/usuarios               ← users.tsx
  /admin/logs                   ← logs.tsx
  /admin/configuracoes          ← settings.tsx
  /admin/perfil                 ← profile.tsx
```

## Entregas por fase

### Fase A — Shell unificado + busca global
- Estender `AdminShell` para incluir TODOS os grupos acima na sidebar (hoje só cobre parcialmente Store + Growth).
- Implementar `AdminGlobalSearch` (⌘K) sobre pedidos, produtos, clientes, leads, alunos, certificados, competições, campanhas.
- Header único com breadcrumb baseado em `useMatches()`.

### Fase B — Camada canônica `/admin/*`
- Criar arquivos `admin.<slug>.tsx` que fazem `export { Route } from "../<original>"` (ou re-declaram `createFileRoute` importando o componente + loader).
- Manter guard `OwnerOnly`/permissões existentes.

### Fase C — Redirect dos legados
- Cada arquivo legado passa a ter `beforeLoad: () => redirect({ to: "/admin/..." })`, mantendo params via `Route.useParams()`.

### Fase D — Migrar `<Link>` internos
- Buscar `to="/store/`, `to="/dojo/app/`, `to="/prospect/`, `to="/instagram/`, `to="/ads/`, `to="/growth/`, `to="/market/`, `to="/users"`, `to="/logs"`, `to="/settings"`, `to="/dashboard"` e reescrever para `/admin/*`.
- Atualizar `AppTopNav` (menu do owner) para apontar para `/admin/*`.

### Fase E — PWA e links externos
- Atualizar manifests (`start_url`, atalhos) e QR codes gerados para `/admin/...`.

## Padronização visual

- Tokens e componentes shadcn já presentes; a fase A padroniza cards/tabelas/filtros/empty-states via wrappers reutilizados de `src/components/admin/*` (`KpiCard`, `AdminSection`, `DataTable`, `EmptyState`).
- Sem mudança de paleta — mantém o design premium claro já aplicado em `/store` e `/admin`.

## Riscos e mitigações

- **Cadeia de redirects**: cada legado redireciona 1x direto ao canônico — sem hops.
- **PWA cache**: bump do `version` no service worker para invalidar rotas antigas.
- **RLS/permissões**: nenhum handler é tocado; guards permanecem nos componentes originais.

## Volume estimado

- ~90 novos arquivos `admin.*.tsx` (thin re-exports).
- ~90 edits para adicionar `redirect` nos legados.
- 1 refator grande no `AdminShell` (sidebar + busca).
- Grep+replace nos `<Link>`.

## Proposta de execução

Como a mudança é grande, sugiro executar em ordem: **A → B (Fight Wear + Dojo) → C → D → E**, com preview navegável ao fim de cada fase. Confirma para eu começar pela **Fase A** (shell + sidebar completa + busca global) já nesta rodada?
