# Refatoração UX/UI — AMT Store (Dojo Manager)

Escopo: exclusivamente visual. Nenhuma regra de negócio, API, hook, server function, cálculo de frete/preço, carrinho ou checkout será alterado. Apenas markup/estilos/microinterações.

## Arquivos afetados (só apresentação)

```
src/routes/dojo.app.store.tsx                              (shell + header/busca/carrinho)
src/routes/dojo.app.store.index.tsx                        (home: banner + categorias + destaques)
src/routes/dojo.app.store.c.$categoria.index.tsx           (listagem por categoria + filtros)
src/routes/dojo.app.store.c.$categoria.$subcategoria.tsx   (listagem por subcategoria)
src/routes/dojo.app.store.produtos.$slug.tsx               (PDP: galeria + variações)
src/routes/dojo.app.store.carrinho.tsx                     (carrinho + resumo lateral)
src/routes/dojo.app.store.pedidos.tsx                      (lista de pedidos)
src/routes/dojo.app.store.pedidos.$id.tsx                  (detalhe do pedido)
```

Componentes visuais novos (isolados, sem lógica):

```
src/components/dojo/store/StoreHeader.tsx        breadcrumb, busca grande, contador do carrinho
src/components/dojo/store/HeroCarousel.tsx       banner rotativo (autoplay + dots)
src/components/dojo/store/CategoryCard.tsx       card premium com hover
src/components/dojo/store/ProductCard.tsx        card com badge, hover-zoom, preço + parcelas
src/components/dojo/store/ProductCardSkeleton.tsx
src/components/dojo/store/FiltersSidebar.tsx     reorganização visual dos filtros existentes
src/components/dojo/store/SearchAutocomplete.tsx dropdown instant-search sobre a busca já existente
src/components/dojo/store/EmptyState.tsx         estados vazios (carrinho / sem resultados / sem pedidos)
src/components/dojo/store/OrderSummary.tsx       resumo sticky do carrinho
src/components/dojo/store/CheckoutSteps.tsx      indicador de progresso
```

## Diretrizes visuais

- Paleta AMT: `background`/`muted` para respiro, `foreground` grafite, `primary` (vermelho institucional) apenas para CTAs/badges/destaques. Nenhum hex hardcoded — só tokens de `src/styles.css`.
- Tipografia da landing do Dojo (Inter) já ativa via `__root.tsx`; hierarquia com `text-3xl/2xl/lg` + `tracking-tight`.
- Espaçamento generoso: `py-10/16`, `gap-6/8`, `rounded-2xl`, `shadow-sm` no repouso, `shadow-lg` no hover.
- Ícones Lucide outline, tamanho 20/24, `strokeWidth={1.75}`.
- Microinterações via classes existentes (`animate-fade-in`, `hover-scale`, `transition-*`) — nada pesado.
- Skeletons via `Skeleton` do shadcn nas listagens.
- Toasts `sonner` já usados — reaproveitar mensagens atuais, sem novos gatilhos.

## Fases

1. Shell + Header + Busca instantânea (`store.tsx` + `StoreHeader` + `SearchAutocomplete`).
2. Home (`store.index.tsx`): hero carrossel, grid de categorias, faixas "Recentes / Mais vendidos / Recomendados" — mantendo as mesmas fontes de dados já usadas.
3. Listagens (`c.$categoria*`): grid premium com `ProductCard`, `FiltersSidebar` recolhível e skeletons.
4. PDP (`produtos.$slug.tsx`): layout 2 colunas, galeria com miniaturas + zoom hover, painel de compra à direita, bloco de informações (produção/entrega/garantia/troca) — todas as ações continuam chamando os handlers atuais.
5. Carrinho (`carrinho.tsx`): lista elegante + `OrderSummary` sticky + `EmptyState` + animações suaves ao remover.
6. Pedidos (`pedidos*`): cards de status, timeline visual, empty state.
7. Passe fino: acessibilidade (aria-labels em ícones, focus-visible), responsividade (grid → 2/1 col em mobile), lazy `loading="lazy"` em imagens, `content-visibility:auto` em faixas longas.

## Garantias

- Nenhum arquivo em `src/lib/store/**`, `src/lib/dojo/**`, hooks, server functions ou migrations será tocado.
- Rotas mantêm exatamente as mesmas queries, mutations, params e navegação (`Link to=`).
- Onde a UI de hoje consome um valor derivado, o novo componente recebe o mesmo valor via prop — sem recalcular preço, frete, parcelamento ou disponibilidade.
- Verificação final: build passa, fluxo carrinho→checkout continua idêntico visualmente no fim do fluxo (checkout branded já existente).

Pode aprovar que eu começo pela Fase 1.
