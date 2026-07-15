## Loja Virtual AMT Fight Wear — nativa no Lovable

Vou construir a loja **inteira dentro do sistema** — catálogo, carrinho, checkout, pedidos e gerenciamento — sem dependência do Shopify. Melhor Envio e gateway de pagamento entram em fase futura, com a arquitetura já preparada.

Escopo grande. Entrego em **fases**; começo pela Fase 1 assim que aprovar.

---

### Fase 1 — Catálogo + Storefront público (ENTREGA AGORA)

**Banco de dados** (novas tabelas + ajustes, com RLS/GRANTs):
- `store_categories` — árvore de categorias (slug, nome, imagem, ordem, parent). Extraídas do menu do site oficial (Kimonos, Rashguards, Faixas, Camisetas, Shorts, Acessórios, etc — o que Firecrawl retornar).
- `store_product_images` — múltiplas imagens por produto (url, ordem, alt).
- `store_product_variants` — variações (tamanho A0..A5, cor, SKU, preço, estoque). A tabela `products` existente ganha `slug`, `short_description`, `description_html`, `category_id`, `featured`, `active`.
- `store_reviews` (opcional, placeholder para futuro).

**Importador** (`importCatalogFromAmt`): server function que:
1. Roda Firecrawl map em `amtfightwear.com.br` → lista URLs de produto.
2. Para cada URL, Firecrawl scrape (markdown + branding + imagens) → extrai nome, preço, descrição, imagens, categoria.
3. IA (`google/gemini-3-flash-preview`) normaliza campos, sugere tamanhos padrão por categoria (kimono A0-A4, rashguard P-GG, faixa A0-A5).
4. Insere/atualiza em `products`, `store_product_images`, `store_product_variants`, `store_categories`.

Página de admin **Importar Catálogo** com barra de progresso.

**Storefront público** (rotas públicas, SEO on, SSR):
- `/loja` — Home da loja: hero AMT, banners de categoria, produtos em destaque, best-sellers, faixa de benefícios (frete, parcelamento, segurança).
- `/loja/categoria/$slug` — grade de produtos com filtros (categoria, faixa de preço, tamanho, cor), ordenação, paginação.
- `/loja/produto/$slug` — página de produto: galeria de imagens (thumbnails + zoom), seletor de tamanho/cor, quantidade, preço + parcelamento simulado, descrição, botão "Comprar" e "Adicionar ao carrinho", sugestões relacionadas.
- `/loja/carrinho` — carrinho persistente (localStorage + sync com `sales_carts`).
- `/loja/checkout` — dados do cliente, endereço (CEP via BrasilAPI/ViaCEP), resumo, botão finalizar (grava `order` com status `pending_payment`, sem pagamento real ainda — mostra "Aguardando gateway").
- `/loja/pedido/$id` — status do pedido pós-checkout.

**Layout** inspirado em grandes e-commerces (Netshoes, Amazon BR, Kingsports):
- Header: logo AMT + busca + minha conta + carrinho (badge)
- Menu horizontal com categorias em mega-menu
- Grid de produtos 4 colunas desktop / 2 mobile, com hover em imagem secundária
- Página de produto em 2 colunas (galeria à esquerda, compra à direita)
- Footer completo com institucional, ajuda, contato, redes sociais, formas de pagamento

Design usa os tokens do `styles.css` atual — sem cores hardcoded. Se você quiser um look específico (dark premium, clean branco/vermelho AMT, etc.), me diga e eu ajusto os tokens.

**Painel administrativo** (`/_authenticated/store/*`):
- `/store/products` — CRUD completo de produtos, variantes, estoque, imagens
- `/store/categories` — organização de categorias
- `/store/orders` — pedidos recebidos, mudar status (novo, pago, enviado, entregue, cancelado)
- `/store/customers` — clientes da loja
- `/store/dashboard` — KPIs (faturamento hoje/mês, pedidos, ticket médio, produtos mais vendidos)

Nova seção no menu lateral: **"Loja Virtual"**.

---

### Fase 2 — Melhor Envio

- Conexão OAuth com Melhor Envio (sandbox + produção)
- Cálculo de frete no carrinho e no PDP (a partir do CEP)
- Geração de etiqueta pós-pagamento, rastreio no `/loja/pedido/$id`
- Painel `/store/shipping` — configurações de origem, transportadoras habilitadas

### Fase 3 — Pagamento

- Recomendação: **Mercado Pago** (líder no Brasil, PIX + cartão + boleto, taxas competitivas) ou **Pagar.me/Stone**. Confirmo com você antes.
- Checkout transparente (PIX + cartão parcelado + boleto)
- Webhook `/api/public/hooks/payment` atualiza pedido para `paid`, dispara e-mail de confirmação e etiqueta do Melhor Envio automaticamente.

### Fase 4 — Growth

- Cupons e promoções, brindes, kits combinados
- E-mail transacional (confirmação, envio, entrega — usando infra de e-mail que já existe no projeto)
- SEO por produto/categoria (JSON-LD Product, sitemap.xml, OG images dinâmicas)
- Programa de indicação e recompra automática

---

### Detalhes técnicos (Fase 1)

- Server functions em `src/lib/store/store.functions.ts` (autenticadas para admin; leitura pública via server publishable client + policies `TO anon` nas tabelas `products`/`store_*` com `active = true`).
- Importador em `src/lib/store/import.server.ts` chamando Firecrawl (já configurado).
- Rotas públicas em `src/routes/loja.*.tsx` (SSR, com `head()` por produto/categoria e og:image = imagem principal).
- Rotas admin em `src/routes/_authenticated/store.*.tsx`.
- Carrinho: hook `useCart()` com Zustand + persist localStorage, sincroniza com `sales_carts` quando o usuário logar.
- Uma migração SQL cria/ajusta todas as tabelas + policies + índices.

Confirma a Fase 1? Assim que aprovar, começo pelo schema + importador rodando na sua base real.
