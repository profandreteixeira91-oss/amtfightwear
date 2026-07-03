## Módulo Tráfego Pago IA (AMT Marketing IA)

Escopo enorme. Vou entregar em **fases**, começando pela Fase 1 (fundação + dashboard + IA estratégica + gerador de copy/criativos), que já entrega valor real. Fases seguintes só depois da sua aprovação.

---

### Fase 1 — Fundação e Consultor IA (ENTREGA AGORA)

**Nova seção no menu lateral: "Tráfego Pago IA"** com submenus:
- Dashboard
- Nova Campanha (fluxo em etapas com IA)
- Campanhas
- Criativos (biblioteca)
- Copies (biblioteca)
- Conexão Meta Ads
- Relatórios

**Banco de dados** (novas tabelas com RLS + GRANTs):
- `ads_accounts` — contas de anúncio Meta conectadas (act_id, nome, moeda, pixel, status)
- `ads_campaigns` — campanhas (objetivo, orçamento, status, meta_campaign_id, estratégia IA em JSON)
- `ads_adsets` — conjuntos de anúncios (público, posicionamentos, orçamento)
- `ads_creatives` — criativos gerados (tipo, imagem_url, copy, score IA)
- `ads_copies` — biblioteca de copies (headline, primary_text, description, cta, score, tags)
- `ads_insights` — métricas diárias por campanha (spend, impressions, clicks, ctr, cpm, cpa, roas, conversions)
- `ads_optimizations` — sugestões da IA (tipo, motivo, ação sugerida, status)
- `ads_briefings` — respostas do questionário estratégico

**IA Estratégica (`generateAdsStrategy`)**: server function que recebe briefing (objetivo, produto, preço, público, região, tom, meta de faturamento) e devolve estratégia estruturada — funil, número de conjuntos, número de anúncios, orçamento recomendado, estimativa de alcance/CPA/ROAS.

**IA de Copy (`generateAdCopy`)**: gera 3 variações completas (headline, texto principal, descrição, CTA, hashtags) com gatilhos mentais e nota de qualidade (0-10) + potencial de clique/conversão.

**IA de Criativos (`generateAdCreative`)**: usa `openai/gpt-image-2` (streaming) para gerar imagens de anúncio em múltiplos formatos (feed square 1080x1080, story 1080x1920). Retorna paleta, tipografia sugerida, posição do produto.

**IA de Público (`suggestAudiences`)**: sugere interesses, lookalikes, remarketing baseado no produto/objetivo.

**IA de Orçamento (`estimateBudget`)**: calcula diário/mensal, CPA/ROAS esperado, projeção de conversões.

**Dashboard**: KPIs (gasto hoje/mês, ROAS, CPA, CTR, CPM, CPC, conversões), gráficos diário/semanal/mensal, top 5 anúncios/públicos/criativos. Enquanto sem dados reais do Meta Ads, mostra empty states — nunca dados fictícios.

**Fluxo Nova Campanha** (wizard em 6 passos):
1. Produto + Objetivo
2. Briefing (orçamento, período, público, tom)
3. IA gera estratégia (usuário revisa)
4. IA gera 3 variações de copy + 2 criativos (usuário aprova/pede refazer)
5. IA sugere públicos + orçamento
6. Resumo + botão "Publicar no Meta Ads" (Fase 2 conecta de fato)

**Conexão Meta Ads**: reaproveita `meta_connections` existente, adiciona endpoint para listar ad accounts do usuário via Graph API (`/me/adaccounts`) e salva em `ads_accounts`. Verifica pixel, permissões, domínio verificado.

**Padrão visual**: reutiliza `PageHeader`, `SectionCard`, `StatCard`, `EmptyState` — idêntico ao resto do AMT Marketing IA.

---

### Fases futuras (após aprovação da Fase 1)

- **Fase 2**: Publicação real no Meta Ads (POST `/act_xxx/campaigns`, `/adsets`, `/ads`), sincronização de insights via cron.
- **Fase 3**: Testes A/B automáticos, IA de otimização contínua (cron 6h analisando CTR/CPM/CPA e criando `ads_optimizations`), alertas (campanha parou, pixel caiu, ROAS despencou).
- **Fase 4**: IA de escala (duplicação automática, lookalikes, escala vertical/horizontal), aprendizado contínuo (embeddings dos criativos vencedores).
- **Fase 5**: Relatórios PDF/Excel, links públicos compartilháveis.
- **Fase 6**: Integrações Google Ads, TikTok Ads, LinkedIn Ads (arquitetura já modular).

---

### Detalhes técnicos (Fase 1)

- Server functions em `src/lib/ads/ads.functions.ts` (autenticadas com `requireSupabaseAuth`)
- Server route em `src/routes/api/generate-ad-image.ts` para streaming de imagens (SSE, `openai/gpt-image-2`, quality low, partial_images 1)
- IA de texto: `google/gemini-3-flash-preview` com `Output.object` (Zod) para respostas estruturadas
- Rotas em `src/routes/_authenticated/ads.*.tsx`
- Migração SQL com todas as tabelas + policies `auth.uid() = user_id`

Confirma a Fase 1? Assim que aprovar, começo a construir.
