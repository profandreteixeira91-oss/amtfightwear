# Fase 2 — Auditoria UX/UI (Prospect · Marketing Engine · Instagram)

Fase 1 já unificou todo o `/store/*` no `PageShell`. Fase 2 estende o mesmo
padrão aos módulos operacionais restantes e limpa inconsistências que hoje
quebram o "sentimento" de sistema único.

## Escopo desta fase (14 rotas)

Prospect Engine
- `prospect.index` · `prospect.leads` · `prospect.qualified` · `prospect.pipeline`
- `prospect.search` · `prospect.logs` · `prospect.settings` · `prospect.$id`

Marketing Engine
- `market.overview` · `market.catalog` · `market.content`
- `market.crm` · `market.pricing` · `market.connections`

Instagram Suite (opcional se sobrar orçamento)
- `instagram.dashboard` · `instagram.inbox` · `instagram.comments`
  · `instagram.automations` · `instagram.crm` · `instagram.account` · `instagram.admin`

## O que muda em cada rota

1. **PageShell obrigatório** — remove containers ad-hoc (`max-w-*`, `py-*`,
   `<h1>` soltos) e passa `title`, `description`, `eyebrow` e `actions` para
   o header padrão. Filtros ficam em `actions`.
2. **Header responsivo** — botões primários viram `size="sm"` no header;
   agrupados em `<div className="flex flex-wrap gap-2">` para não estourar
   no mobile.
3. **Consistência tipográfica** — títulos passam a herdar de `PageHeader`
   (28px bold desktop / 22px mobile). Nada de `text-3xl font-black` avulso.
4. **Tokens de cor** — substituir `text-gray-*`, `bg-white`, `text-black`
   por `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`.
5. **Estados vazios/erro** — todos os módulos passam a usar
   `EmptyState` e `ErrorState` de `@/components/common`.
6. **Acessibilidade** — `aria-label` em botões apenas-ícone (ex.: apagar,
   enriquecer, atalhos de estágio), `role="status"` em skeletons e
   `<main>` único garantido pelo layout `_authenticated`.
7. **Cards padronizados** — mesma sombra (`shadow-sm`), radius (`rounded-xl`),
   e header interno (`CardHeader` com título medium + descrição muted).
8. **Mobile-first no header** — aplica o padrão
   `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `truncate` do guia de
   layout responsivo, evitando o "estouro" atual em telas < 640px.

## Detalhes técnicos

- Manter 100% da lógica de dados: apenas envelopar retorno JSX no
  `PageShell` e mover controles de topo para `actions`.
- Onde já existe `PageHeader`, remover a chamada direta e usar `PageShell`
  para unificar padding lateral.
- Onde há tabs no topo (ex.: Prospect com Leads/Qualificados/Pipeline),
  renderizar `<Tabs>` como primeiro filho do PageShell, não dentro do
  header — mantém o breadcrumb visível.
- Marketing Engine `market.overview` recebe grid de KPIs no mesmo estilo
  da dashboard da loja (Recharts, 4 cards + 1 gráfico principal).
- Nenhuma mudança de rota, schema ou server function.

## Entregáveis

- 14 rotas com `PageShell` uniforme.
- Zero `<h1>` avulso ou `max-w-*` duplicado nessas páginas.
- Screenshots antes/depois para as 3 rotas mais críticas (leads,
  qualified, market.overview) via Playwright headless.

## Fora do escopo (fica para Fase 3)

- Redesign visual do Dojo Manager (`/dojo/app/*`).
- Landing pages públicas (`/loja`, `/atacado-lp`).
- Refatoração dos modais compartilhados (LeadDrawer, IGComposer).

Confirma que sigo com esse recorte, ou prefere reordenar (ex.: Instagram
antes de Marketing Engine)?
