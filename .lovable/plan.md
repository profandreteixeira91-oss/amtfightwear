# Auditoria de UI/UX AMT Fight Wear — Plano em Fases

O sistema tem 80+ rotas entre loja, painel administrativo, Dojo Manager, app do aluno e landing pages. Uma varredura única entregaria mudanças rasas e inconsistentes. A proposta é criar uma **fundação de design tokens/primitivas** e depois aplicar por área, com você validando cada fase.

## Fase 0 — Fundação (sem mudança visível, base para o resto)

Padroniza os tokens que hoje variam de página para página:

- **Espaçamentos** em `src/styles.css`: tokens `--space-section` (24px), `--space-card` (16px), `--space-field` (12px), `--space-inline` (8px) + utilitários `space-y-section`, `gap-cards`.
- **Escala tipográfica** consistente: `text-page-title` (28/32), `text-section-title` (18/20), `text-card-title` (15/16), `text-body` (14), `text-meta` (12) — hoje cada tela usa tamanhos ad-hoc.
- **Container padrão** `<PageShell>` com `max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6` para eliminar as margens inconsistentes entre `p-4`, `p-6`, `p-8` que aparecem misturadas.
- **Grid responsivo padrão**: helper `.grid-cards` que resolve `1 → 2 → 3` (nunca 4+ em desktop) automaticamente. Substitui as ~30 variações de `grid-cols-*` espalhadas.
- **Wrapper de tabela** `<DataTable>` com scroll horizontal isolado (`overflow-x-auto` na tabela, não na página), cabeçalho sticky e larguras mínimas de coluna.
- **Card com padding confortável** por padrão: `p-6` (não `p-3`/`p-4` que aperta conteúdo).

## Fase 1 — Painel administrativo da loja (mais crítico)

Rotas: `store.index`, `store.orders`, `store.products`, `store.customers`, `store.wholesale`, `store.faixa-calc`, `store.sizes`, `store.import`, `store.chat`, `store.imagens`, `store.shipping`.

Aplicações:
- Header padronizado com título + subtítulo + ações à direita (agrupa botões em "Mais ações" quando >2).
- Filtros globais em barra dedicada, não misturados com KPIs.
- Tabelas com colunas proporcionais, ações em dropdown ao invés de 4-5 botões inline.
- Formulários com campos longos (descrição, endereço) em full-width; campos curtos lado a lado.
- Modais com largura mínima decente (`max-w-2xl` para forms, `max-w-4xl` para detalhes).

## Fase 2 — Dojo Manager

Rotas: `dojo.app.*` (alunos, financeiro, agenda, avaliações, graduações, check-in, competições, quadro-de-avisos, store).

Reorganiza dashboards que hoje têm KPIs em linhas de 6-7 cards; quebra em blocos temáticos (Financeiro / Alunos / Aulas) com no máximo 4 por linha.

## Fase 3 — Loja pública e app do aluno

Rotas: `/loja/*`, `atacado-lp`, `app.*` (portal do aluno PWA).

Foco em respiração vertical, hierarquia entre título de seção e conteúdo, densidade mobile.

## Fase 4 — Landing pages e páginas institucionais

Rotas: `/`, `dojo/index`, `privacy`, `terms`, `data-deletion`, `auth`, `reset-password`.

Passe final de espaçamento/tipografia.

---

## O que NÃO muda

- Nenhuma regra de negócio, fluxo, banco ou funcionalidade.
- Nenhum componente é removido — só reorganizado, reagrupado ou tem padding/grid ajustado.
- Cores da marca (vermelho AMT + preto/branco) mantidas — só melhora contraste e hierarquia onde estiver ruim.

## Como quero prosseguir

Preciso que você confirme **qual fase começar primeiro** (recomendo Fase 0 + Fase 1 no próximo turno — a fundação sozinha já melhora tudo, e a Fase 1 tem o maior impacto operacional).

Se quiser priorizar telas específicas em vez de áreas inteiras (ex: "só a dashboard e a página de pedidos"), me diga quais.
