# Auditoria UX/UI Mobile — Dojo Manager

Escopo: apenas ajustes de layout/responsividade para experiência premium no mobile. **Sem alterar design system, cores, funções ou rotas.** Foco em: eliminar overflow horizontal, alvos de toque ≥ 44px, hierarquia tipográfica legível, tabelas em cards no mobile, dialogs/sheets respiráveis, botões de ação empilhados e sticky quando necessário.

## Padrões aplicados em todas as etapas

- Containers com `min-w-0` + `overflow-x-hidden` onde há grids/flex com texto longo.
- Dialogs: `w-[calc(100vw-1rem)]`, header/footer sticky, corpo rolável.
- Tabelas densas viram **cards empilhados** no `< sm`, tabela reaparece no `sm:`.
- Botões primários com `w-full` no mobile, `w-auto` no `sm:`.
- Filtros/ações agrupadas em `Sheet` ou seção colapsável no mobile.
- Headers de página: título + subtítulo em coluna, chips/ações abaixo.
- Sem mudança de tokens de cor, tipografia base, ícones ou rotas.

## Etapas

### Etapa 1 — Núcleo do fluxo diário
Rotas: `dojo.app.index` (dashboard), `dojo.app.students.index`, `dojo.app.students.$id`, `dojo.app.checkin`, `dojo.app.schedule` (revisão pós-refactor recente).
Foco: cards do dashboard responsivos, lista de alunos em cards no mobile, perfil com abas roláveis horizontalmente, check-in one-hand friendly.

### Etapa 2 — Financeiro e vendas
Rotas: `dojo.app.finance`, `dojo.app.sales`, `dojo.app.plans`, `dojo.app.account`, `dojo.app.integrations`.
Foco: tabelas de vendas/faturas em cards, formulários de nova venda em passos claros, cards de assinatura sem overflow.

### Etapa 3 — Graduações, avaliações e planos de aula
Rotas: `dojo.app.graduations`, `dojo.app.evaluations.*`, `dojo.app.lesson-plans.*`, `dojo.app.belts`.
Foco: seleção de aluno + faixa mobile-first, sessões de avaliação com steps, listas de técnicas com busca sticky.

### Etapa 4 — Certificados, contratos e comunicações
Rotas: `dojo.app.certificates`, `dojo.app.contracts.*`, `dojo.app.contract-templates.*`, `dojo.app.announcements`, `dojo.app.notifications`.
Foco: editores com toolbars roláveis horizontalmente, preview colapsável no mobile, listas de emitidos em cards.

### Etapa 5 — Equipe, ranking, competições, unidades e benefícios
Rotas: `dojo.app.team.*`, `dojo.app.ranking` (revisão), `dojo.app.competitions.*`, `dojo.app.corporate-benefits`, `dojo.app.units` (se existir).
Foco: cards de perfil, tabs empilhadas, formulários financeiros condicionais já ajustados só validados.

### Etapa 6 — Store interna e suporte
Rotas: `dojo.app.store.*`, `dojo.app.support`, `dojo.app.install`, `dojo.app.student-app-qr`, `dojo.app.apk-versions`, `dojo.app.belt-studio`.
Foco: grid de produtos 2 colunas mobile, carrinho/pedidos em cards, QR/install em hero centralizado.

## Entrega por etapa
Cada etapa é um turno separado com:
1. Diagnóstico curto por rota (o que estava quebrando no mobile).
2. Edits cirúrgicos (sem tocar em lógica, tokens, rotas).
3. Print de verificação via Playwright viewport 390×844 nas rotas críticas.

Confirma o plano e começo pela **Etapa 1**?
