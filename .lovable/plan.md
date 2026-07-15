# Otimização das imagens dos produtos

Hoje as **1.848 imagens** dos 309 produtos estão hospedadas no CDN da Tiendanube (`acdn-us.mitiendanube.com`) — sempre que alguém abre a loja, o navegador precisa conectar a esse servidor externo, o que deixa o carregamento inconsistente e depende de um serviço que não controlamos.

## O que vou fazer

### 1. Armazenar as imagens no Lovable Cloud

- Criar um bucket público **`product-images`** no armazenamento do projeto.
- Criar uma rotina de migração que:
  - Percorre todas as imagens em `store_product_images` cuja URL ainda aponta para servidor externo.
  - Baixa a imagem, envia para o bucket `product-images/{product_id}/{image_id}.{ext}`.
  - Atualiza `store_product_images.url` para a nova URL local.
  - Processa em lotes (25 imagens por vez) para não estourar timeout.
  - Preserva a URL antiga em `alt` como backup silencioso (fallback).
- Rotina reentrante: se interrompida, continua de onde parou (só processa URLs externas).

### 2. Interface para disparar/monitorar a migração

- Nova página **`/store/imagens`** no admin, com:
  - Contador ao vivo: "X de 1.848 imagens migradas".
  - Botão **"Migrar próximo lote"** (processa 25 imagens).
  - Botão **"Migrar tudo"** (loop automático até terminar).
  - Log das últimas 20 migrações (sucesso/erro).

### 3. Otimizar a renderização no frontend

- Trocar `<img>` cru por um componente `ProductImage` que aplica:
  - `loading="lazy"` para todas exceto a primeira dobra.
  - `decoding="async"`.
  - `fetchpriority="high"` na primeira imagem visível da página.
  - Contêiner com `aspect-ratio` fixo → evita o "salto" de layout enquanto carrega.
  - Placeholder cinza suave até a imagem chegar.
- Aplicar em: catálogo (`/loja`), página do produto (`/loja/produto/...`), carrinho (`/loja/carrinho`) e páginas do admin que listam produtos.
- Preload da imagem principal (LCP) na página do produto via `head().links`.

### 4. Novas imagens importadas no futuro

- Ajustar o importador da Tiendanube (`import.functions.ts`) para já baixar direto para o bucket na importação — sem passar pela URL externa.

## Impacto esperado

- Carregamento mais rápido e previsível (mesmo servidor da loja, mesmo cache do navegador).
- Independência do CDN da Tiendanube (se eles removerem as imagens, você não perde).
- Menos "pulos" de layout enquanto a página monta.
- Contas do Lovable Cloud: as imagens do catálogo cabem folgado no plano — estimativa ~200–400 MB total.

## Detalhes técnicos

- Bucket: `product-images`, público, com política de leitura `TO anon`.
- Estrutura: `{product_id}/{image_id}.{ext}` — permite deletar todas as imagens de um produto de uma vez.
- Content-Type detectado do `Content-Type` da resposta HTTP (fallback `image/jpeg`).
- Rate limit: 25 imagens por invocação de server function (fica sob 10s de execução).
- Componente `ProductImage` centraliza `loading`, `decoding`, `fetchpriority` e o wrapper com `aspect-ratio`.

Posso começar assim que aprovar.
