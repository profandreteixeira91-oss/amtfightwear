
# Reconstrução Completa — Prospect Engine (novo Lead Scraper)

Vou remover 100% do módulo antigo de Lead Scraper e construir do zero um novo módulo chamado **Prospect Engine**, com arquitetura modular, banco novo, UI premium e IA integrada.

---

## 1. Remoção do módulo antigo

Excluir por completo:

- Rotas: `market.leads.tsx`, `market.leads.pipeline.tsx`, `market.leads.sequences.tsx`, `market.leads.prospecting.tsx` e demais rotas relacionadas.
- Componentes: `LeadsMap`, `CitySearchCombobox`, tabelas e painéis do módulo atual.
- Bibliotecas: `src/lib/lead-scraper.functions.ts`, `auto-scrape-leads.ts`, `auto-outreach.ts`, `auto-followup.ts`.
- Tabelas antigas: `leads`, `lead_enrichments`, `lead_history`, `lead_exports`, `outreach_log`, `outreach_settings`, `email_sequences`, `email_sequence_runs`, `scrape_runs`, `scraper_automations`, `scraper_logs`, `scraper_settings`.
- Entradas correspondentes na Sidebar.
- Cron jobs `auto-scrape-*`, `auto-outreach-*`, `auto-followup-*`.

Nada será reaproveitado. Se algo do CRM/Instagram Hub depender dessas tabelas, faço a desconexão limpa.

---

## 2. Novo banco de dados (schema `prospect_*`)

Migração única criando o schema completo, com RLS por `user_id` e GRANTs corretos:

- `prospect_companies` — empresa/lead principal (nome, categoria, segmento, cidade, estado, país, CEP, lat/lng, website, telefone, endereço, horário, responsável, logo_url, origem, score, status, pipeline_stage, tags[], notes, owner_id, timestamps).
- `prospect_contacts` — canais de contato normalizados (tipo: email/whatsapp/instagram/phone, valor, verificado, prioridade, origem).
- `prospect_searches` — pesquisas salvas (query, filtros, agendamento, última execução, resultado agregado).
- `prospect_enrichment_jobs` — fila (status: pending/running/success/failed, tentativas, campos encontrados, erro).
- `prospect_timeline` — eventos (tipo, payload jsonb, actor).
- `prospect_sequences` + `prospect_sequence_steps` + `prospect_sequence_runs`.
- `prospect_automations` (triggers → actions em jsonb).
- `prospect_exports` (formato, filtros, arquivo).
- `prospect_settings` (por usuário; templates, intervalos, campos obrigatórios).
- `prospect_logs` (auditoria detalhada).

Índices em `owner_id`, `status`, `pipeline_stage`, `state`, `category`, `score`, `(lat,lng)`.
Uniqueness em `(owner_id, normalized_name, city)` para dedupe.

---

## 3. Arquitetura de código

```text
src/features/prospect/
  components/       ← UI reutilizável (LeadCard, LeadTable, PipelineBoard, MapView, ScoreBadge, ContactActions, EnrichmentBadge, Filters, StatCard, TimelineFeed)
  pages/            ← telas do módulo (importadas pelas rotas)
  hooks/            ← useProspectLeads, usePipeline, useEnrichment, useSearches...
  services/         ← client-side wrappers sobre server functions
  types/            ← tipos e enums (PipelineStage, LeadStatus, ContactChannel, LeadScore)
  utils/            ← score, dedupe, formatação, normalização telefone/handle
  validation/       ← schemas zod
src/lib/prospect/
  prospect.functions.ts       ← createServerFn (CRUD, busca, pipeline, ações)
  prospect-search.server.ts   ← motor de busca (Firecrawl + heurísticas)
  prospect-enrichment.server.ts ← pipeline enrichment (email/whatsapp/instagram prioritários)
  prospect-ai.server.ts       ← Gemini: resumo, score, sugestão de abordagem
  prospect-automations.server.ts
src/routes/_authenticated/prospect.*.tsx  ← rotas TanStack
src/routes/api/public/hooks/prospect-*.ts ← cron endpoints
```

Separação estrita entre UI, hooks, serviços e regras de negócio. Tudo com tipos e validações zod.

---

## 4. Rotas / menu

Novo grupo na Sidebar **"Prospect Engine"**:

`/prospect` Dashboard · `/prospect/search` Prospecção · `/prospect/leads` Leads · `/prospect/leads/$id` Perfil do Lead · `/prospect/pipeline` Pipeline (Kanban) · `/prospect/sequences` Sequências · `/prospect/searches` Pesquisas salvas · `/prospect/enrichment` Central de Enriquecimento · `/prospect/map` Mapa · `/prospect/exports` Exportações · `/prospect/automations` Automações · `/prospect/settings` Configurações · `/prospect/logs` Logs.

---

## 5. Funcionalidades chave

**Dashboard**: 15+ KPIs (hoje/semana/mês, enriquecidos, qualificados, taxas, contatos por canal), gráficos (Recharts) de evolução diária/semanal/mensal, mapa por estado/cidade, listas de últimas pesquisas, automações e contatos.

**Prospecção**: formulário rico (segmento, cidade autocomplete IBGE, estado, CEP+raio, país, palavras-chave, categoria, qtd), presets de segmento (restaurantes, academias, clínicas, etc.), execução assíncrona com progresso em tempo real via Supabase Realtime.

**Motor de busca**: Firecrawl + Google search consolidado, dedupe por nome+cidade+website, insere em `prospect_companies` e enfileira job de enriquecimento.

**Enriquecimento (prioridade Email → WhatsApp → Instagram)**:
1. Scrape website → extrai mailto:, tel:, wa.me/, links `instagram.com/@handle`.
2. Fallback: busca Google `"empresa" contato email`, `"empresa" whatsapp`, `site:instagram.com "empresa"`.
3. IA (Gemini) valida/extrai contatos das páginas.
4. Se não achar canal obrigatório → status `Não encontrado` + reprocessamento habilitado.
5. Popula demais campos (endereço, horário, responsável).

**Lead Score (0-100 / ★★★★★)**: pesos configuráveis, atualização automática após enriquecimento.

**Lista de Leads**: tabela virtualizada, filtros compostos, ordenação, paginação, alternância Cards/Lista, seleção múltipla, bulk actions.

**Ações rápidas por Lead**:
- **Email** → abre composer do sistema pré-preenchido (destinatário/empresa/nome/template) e registra evento.
- **WhatsApp** → abre `https://wa.me/<numero>?text=<mensagem template>` e registra.
- **Instagram** → abre `https://instagram.com/<handle>` em nova aba e registra.

**Perfil do Lead**: layout completo com logo, dados, tags, observações, timeline cronológica, responsável, sugestões de IA.

**Pipeline Kanban**: 10 etapas (Novo → Perdido), drag-and-drop com `@dnd-kit`, contadores, filtros.

**Sequências**: editor visual de passos (dia N → ação), cancelamento automático ao receber resposta, cron horário.

**Pesquisas salvas**: duplicar, editar, agendar (cron), reexecutar.

**Central de Enriquecimento**: fila pendente, taxa de sucesso, reprocessamento manual em lote.

**Mapa**: Leaflet com clusters, filtros por cidade/estado/categoria/score/status.

**Exportação**: CSV, Excel (xlsx), PDF (pdf-lib) e JSON com seleção de colunas + filtros aplicados.

**Automações**: builder de regras (trigger → condições → ações encadeadas).

**Configurações**: campos obrigatórios, pesos do score, intervalos, templates de email/WhatsApp, mensagens padrão, permissões.

**Logs**: auditoria completa, busca, filtro, export, drill-down.

**IA (Lovable AI Gateway, `google/gemini-3-flash-preview`)**: classificação, resumo da empresa, potencial comercial, sugestão de abordagem, geração de assunto/corpo de email, melhor horário, canal prioritário, prioridade.

---

## 6. UI/UX

- Design premium com tokens semânticos do design system existente (dark/light).
- Framer Motion em transições, cards e Kanban.
- Skeletons durante loading, toasts em ações, Command Palette (Cmd+K) para busca rápida de leads.
- Shadcn components: Table, Sheet, Dialog, Tabs, Combobox, DropdownMenu, Badge, Progress.
- Responsivo total.

---

## 7. Detalhes técnicos

- Todas as leituras via `createServerFn` + TanStack Query (`ensureQueryData` no loader, `useSuspenseQuery` no componente).
- Realtime via `supabase.channel` para progresso de pesquisas e novos leads.
- Cron endpoints em `/api/public/hooks/prospect-*` com header secreto (`PROSPECT_CRON_SECRET` — gerado automaticamente).
- Enrichment worker acionado por `pg_net` a cada 5 min.
- Reutilização do Firecrawl existente (secret já configurado) e Lovable AI (sem key extra).
- Validação zod em todas as entradas de servidor.

---

## 8. Entregas em fases (nesta ordem, tudo neste turno se possível)

1. Migração destrutiva: DROP tabelas antigas + CREATE schema novo (com aviso claro no diff).
2. Remoção de rotas/arquivos antigos + Sidebar.
3. Camada de tipos, validação, utils.
4. Server functions + workers.
5. Componentes base + páginas.
6. Rotas e navegação.
7. Cron e automações.
8. Publicação.

---

**Confirma a exclusão TOTAL do módulo Lead Scraper atual (incluindo todos os leads já capturados nas tabelas antigas) para eu iniciar a reconstrução?**
