## Lead Scraper IA — Plano de Expansão

Vou **manter intacta** a busca automática atual (rotação diária Nordeste + segmentação por modalidade, cron 2x/dia, fila de outreach com cooldown de 7 dias, Direct assistido, e-mail e WhatsApp). O plano abaixo **complementa** o módulo, adicionando os submenus, enriquecimento, mapa, exportações, automações e configurações pedidos, seguindo o padrão visual do sistema (shadcn + Framer Motion + React Query).

---

### 1. Navegação (Sidebar)

Novo grupo **Lead Scraper IA** substituindo o item único atual, com submenus:
- Dashboard · Pesquisas · Leads · Enriquecimento · Mapa · Exportações · Automações · Configurações
- (Sem "Nova Pesquisa" manual — mantemos 100% automático, conforme decisão anterior; a rota "Pesquisas" mostra o histórico das rodadas do autopilot e permite disparar uma rodada extra.)

### 2. Banco de dados (nova migração)

Ampliar `leads` com colunas públicas: `legal_name`, `trade_name`, `cnpj`, `category`, `description`, `whatsapp`, `website`, `facebook`, `linkedin`, `address`, `zip`, `rating`, `reviews_count`, `business_hours jsonb`, `ai_score int`, `ai_summary`, `ai_approach`, `tags text[]`, `owner_id uuid`, `status` (novo/qualificado/contatado/descartado), `enrichment_status`, `enriched_at`, `data_source`.

Novas tabelas (todas com RLS por `user_id`/`owner_id`, GRANT authenticated + service_role, triggers `updated_at` e auditoria):
- `scrape_runs` — histórico de rodadas (cidade, UF, tema, encontrados, duração, status, erro).
- `lead_enrichments` — log por lead (campo, valor antigo/novo, fonte, timestamp).
- `lead_history` — auditoria de alterações.
- `lead_exports` — arquivos gerados (formato, filtros, url, count).
- `scraper_automations` — cron rules (nome, schedule cron, tipo: pesquisa/enriquecimento/webhook, params jsonb, ativo).
- `scraper_settings` — 1 linha por user (limites, timeout, intervalo, concorrência, créditos).
- `scraper_logs` — logs operacionais.

Índices em `leads(city, state, ai_score, status, created_at)` e `leads(lat,lng)` para o mapa.

### 3. Dashboard (`/lead-scraper`)

KPIs (React Query + skeletons): total pesquisas, leads, empresas, enriquecidos, emails, telefones, sites, redes sociais, taxa de enriquecimento, créditos usados.
Gráficos (Recharts): leads/dia (30d), por segmento, por cidade (top 10), por estado (mapa de calor UF), evolução mensal, origem dos dados. Tabela "Últimas pesquisas" ligada a `scrape_runs`.

### 4. Leads (gerenciamento)

Reescrever `market.leads.tsx` como página completa:
- DataTable server-side (paginação, ordenação, busca instantânea).
- Filtros avançados em Drawer: cidade, UF, segmento, categoria, nota, status, responsável, tags, origem, período, score IA, possui email/tel/site/redes, enriquecido.
- Três visualizações: **Tabela**, **Cartões**, **Mapa** (toggle).
- Ações em massa: excluir, duplicar, mover para CRM (`crm_deals`), adicionar tags, alterar responsável, enriquecer, exportar seleção.
- Drawer de detalhes com: dados públicos, score IA, resumo IA, abordagem sugerida, mensagens geradas (email/WA/Direct/LinkedIn), histórico e ações rápidas (abrir Direct — já implementado, WhatsApp, copiar email).

### 5. Enriquecimento (`/lead-scraper/enrichment`)

Server function `enrichLead` (Firecrawl + Gemini):
- Scrape do site → extrai emails/telefones públicos, redes sociais, tecnologias (via headers/HTML).
- Valida domínio (DNS/MX via fetch).
- Atualiza `leads` e registra em `lead_enrichments`.
- Fila em lote com progresso (Realtime channel).
Página mostra: leads pendentes, em processamento, concluídos, botões "Enriquecer selecionados" e "Enriquecer todos os novos".

### 6. IA (integrada no enriquecimento e no autopilot atual)

Nova função `scoreLead` (Gemini Flash) — retorna `{score, potential, segment, summary, approach, best_contact_hour, duplicates:[]}` e grava no lead. Executada logo após scrape + enrichment. A geração de mensagens (email/WA/Direct/LinkedIn) reaproveita o `generateOutreach` atual, apenas expondo o botão "LinkedIn" adicional.

### 7. Mapa (`/lead-scraper/map`)

Leaflet (já instalado): marcadores com cluster (`leaflet.markercluster`), popup com dados rápidos + link para o drawer, filtros laterais (UF/segmento/score), busca por região (bbox), botão "Buscar nesta área" que enfileira uma rodada de scrape para o centro do mapa.

### 8. Exportações (`/lead-scraper/exports`)

Server fn `exportLeads({format, filters})` gerando CSV/Excel (SheetJS)/PDF (pdf-lib)/JSON, salvando no bucket `lead-exports` (novo) e registrando em `lead_exports`. Botão "Copiar" copia JSON/CSV filtrado para clipboard.

### 9. Automações (`/lead-scraper/automations`)

CRUD sobre `scraper_automations`. Ao salvar, cria/atualiza `cron.schedule` via migração dinâmica (função SQL `upsert_scraper_cron`) chamando os hooks públicos:
- `/api/public/hooks/auto-scrape-leads` (existente, preservado).
- `/api/public/hooks/auto-enrich-leads` (novo).
- `/api/public/hooks/auto-outreach` (existente).
- `/api/public/hooks/scraper-webhook` (novo — dispara webhook configurado).

### 10. Configurações (`/lead-scraper/settings`)

Formulário sobre `scraper_settings`: limite por pesquisa, timeout, intervalo entre consultas, concorrência máxima, créditos, integrações (Firecrawl status — já conectado), API Keys (readonly mask), webhooks (URL + secret), permissões (por role), link para Logs.

### 11. Logs (`/lead-scraper/settings` → aba Logs)

Tabela de `scraper_logs` + `scrape_runs` com filtros por período/usuário/tipo/status.

### 12. Performance & UX

- Todas as listas com paginação server-side + `useInfiniteQuery` opcional para scroll.
- Skeletons em cada card/tabela.
- Retry automático (React Query `retry: 2`) nas server fns idempotentes.
- Realtime (`supabase.channel`) para progresso de rodadas e enriquecimento.
- Dark/Light já suportados pelo tema global.

### 13. Segurança & LGPD

- Apenas dados públicos; nenhum bypass de captcha/rate-limit.
- RLS por `user_id`/`owner_id` em todas as tabelas novas.
- Campo `data_source` obrigatório em cada lead + timestamp de coleta.
- Página Configurações inclui aviso LGPD e botão "Excluir lead permanentemente" (hard delete + registro em `lead_history`).

---

### O que NÃO muda

- Rotina de busca automática (`auto-scrape-leads` cron 2x/dia, foco Nordeste, filtro rígido de cidade/UF, segmentação por modalidade).
- Prompts formais de outreach ("Prezados, …").
- Fluxo do Direct assistido (desktop `/direct/new`, mobile deep link) e cooldown de 7 dias.

Posso prosseguir com a implementação seguindo este plano?
