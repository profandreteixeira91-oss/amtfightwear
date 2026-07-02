# Módulo de Captação de Leads — Versão Avançada

Vou transformar o Lead Scraper atual em uma central completa de prospecção, mantendo o que já funciona (busca automática por nicho, geolocalização, autopilot de outreach, enriquecimento Firecrawl) e adicionando as camadas que faltam: qualificação Instagram, pipeline visual, sequências de follow-up, dashboard avançado e Central de Prospecção.

## O que já existe (será reaproveitado)
- Tabelas `leads`, `outreach_log`, `outreach_settings`, `lead_enrichments`, `lead_history`, `lead_exports`
- Hooks automáticos: `auto-scrape-leads`, `auto-outreach`
- Enriquecimento via Firecrawl + Gemini
- Rotas `lead-scraper.*` (dashboard, enriquecimento, score, mapa, exports)
- Priorização regional (Nordeste)
- Restrição de catálogo (kimonos, faixas, patches)

## O que vou adicionar

### 1. Banco de dados (migração)
Novas colunas em `leads`:
- `instagram_handle`, `instagram_url`, `instagram_bio`, `instagram_followers`, `instagram_verified`, `instagram_is_business`
- `whatsapp`, `website_title`, `cnpj`, `business_hours`, `category`
- `pipeline_stage` (enum: novo, enriquecido, contato_iniciado, resposta_recebida, reuniao, proposta, cliente, perdido)
- `ai_summary`, `ai_opportunities`, `ai_recommended_approach`
- `lead_score` (já pode existir — se sim, apenas garantir)
- `last_contact_at`, `last_response_at`

Nova tabela `email_sequences`:
- template steps (dia 0, 3, 7, 15), subject, body
- gerenciada por usuário

Nova tabela `email_sequence_runs`:
- lead_id, sequence_id, current_step, next_send_at, status (running/paused/completed/cancelled_by_reply)

### 2. Enriquecimento aprimorado (`src/lib/leads-scraper.functions.ts`)
- Ao localizar site, extrair handle Instagram do HTML/links
- Buscar perfil Instagram público (via scrape do bio/seguidores quando possível)
- Extrair WhatsApp (regex `wa.me/`, `api.whatsapp.com`, telefones formatados)
- Extrair CNPJ, horários, categoria
- **Não salvar lead sem tentar localizar e-mail + Instagram** — se ambos ausentes após enriquecimento, marcar como `low_quality` (mantém no banco mas não entra no funil ativo)
- Recalcular Lead Score com pesos: email 30, instagram 25, telefone 15, website 10, whatsapp 10, bio/seguidores 10

### 3. Análise IA por lead
Server function `analyzeLeadWithAI`:
- Recebe lead enriquecido
- Gemini gera: resumo (2 linhas), oportunidades detectadas, abordagem sugerida, canal recomendado (email/instagram/whatsapp)
- Salva em `ai_summary`, `ai_opportunities`, `ai_recommended_approach`

### 4. Pipeline / Kanban
Nova rota `lead-scraper.pipeline.tsx`:
- Colunas kanban por `pipeline_stage`
- Drag & drop entre estágios
- Card mostra empresa, cidade, score, canais disponíveis

### 5. Central de Prospecção
Nova rota `lead-scraper.prospeccao.tsx`:
- Tabela avançada: Foto/Avatar (via Instagram profile pic), Empresa, IG, Email, Tel, Cidade, Segmento, Status, Último contato, Lead Score
- Filtros rápidos (com/sem email, com/sem IG, por estágio, por score mínimo)
- Ordenação e paginação
- Ação: "Abrir perfil IG" → `https://instagram.com/{handle}` em nova aba
- Ação: "Iniciar sequência" (dispara `email_sequence_run`)

### 6. Sequências de Follow-up
Nova rota `lead-scraper.sequences.tsx`:
- CRUD de sequências (nome + steps dia 0/3/7/15 com subject e body, com placeholders {empresa}, {cidade}, {segmento})
- Ao iniciar sequência para um lead, cria `email_sequence_run` com `next_send_at = now()`
- Hook cron `auto-followup.ts` (a cada hora):
  - Busca runs com `next_send_at <= now()` e `status=running`
  - Envia próximo step via email queue existente
  - Atualiza `current_step` e `next_send_at`
  - Se lead recebeu resposta (`last_response_at > run.created_at`), cancela automaticamente
- Cron: `0 * * * *`

### 7. Dashboard avançado (atualizar `lead-scraper.dashboard.tsx`)
Novos KPIs:
- Leads encontrados hoje
- Leads enriquecidos
- E-mails encontrados / Instagram encontrados
- Taxa de enriquecimento (%)
- E-mails enviados (24h/7d)
- Taxa de resposta
- Conversões (lead → cliente)
- Distribuição por estágio (gráfico)

### 8. Busca contínua aprimorada
- `auto-scrape-leads` já roda diariamente com rotação geográfica; vou aumentar cobertura para 3 execuções/dia (manhã/tarde/noite) rotacionando segmentos: academias → escolas → equipes/projetos
- Deduplicação por `website` OR `instagram_handle` OR `phone` normalizado
- Se lead já existe, apenas re-enriquece campos vazios

### 9. UI/UX
- Sidebar: novo item "Prospecção" e "Pipeline" e "Sequências" dentro do grupo Lead Scraper
- Componentes shadcn + framer motion (mantendo padrão existente)
- Avatares circulares, badges de canal disponível (📧 IG ☎ WA)
- Modo escuro já herdado

## Arquivos afetados

**Migração SQL (1)**
- Novas colunas em `leads`, novas tabelas `email_sequences` e `email_sequence_runs` + GRANTs + RLS

**Backend / server functions**
- `src/lib/leads-scraper.functions.ts` — enriquecimento IG, WhatsApp, AI analysis, atualização de pipeline
- `src/lib/email-sequences.functions.ts` (novo) — CRUD sequências, iniciar/pausar run
- `src/routes/api/public/hooks/auto-followup.ts` (novo) — cron de disparo de follow-up
- `src/routes/api/public/hooks/auto-scrape-leads.ts` — 3 execuções/dia + dedup melhorada
- Cron SQL: agendar `auto-followup` e ajustar frequência do scrape

**Frontend**
- `src/routes/_authenticated/lead-scraper.prospeccao.tsx` (novo) — Central de Prospecção
- `src/routes/_authenticated/lead-scraper.pipeline.tsx` (novo) — Kanban
- `src/routes/_authenticated/lead-scraper.sequences.tsx` (novo) — Sequências
- `src/routes/_authenticated/lead-scraper.dashboard.tsx` — KPIs expandidos
- `src/routes/_authenticated/lead-scraper.enrichment.tsx` — mostrar campos IG/WA/AI
- `src/components/AppSidebar.tsx` — novos itens de menu

## Considerações
- **Instagram**: sem API oficial para dados de perfil de terceiros; farei melhor esforço via scrape da página pública (Firecrawl) para bio/verificação; seguidores nem sempre disponíveis — campos ficam opcionais
- **Dedupe**: usar índice único parcial em `website` e `instagram_handle` (não em phone porque formato varia)
- **Sequências**: reutilizam a infraestrutura de email queue já configurada (aguardando DNS propagar)
- **Follow-up cancelamento por resposta**: precisamos capturar respostas — por ora, marcaremos manualmente via botão "Marcar como respondido" na Central; futuramente via webhook IMAP

Confirma para eu executar?