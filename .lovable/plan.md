
# Instagram Hub — Central de Relacionamento e Prospecção

Vou construir um módulo modular, escalável e preparado para múltiplos canais (WhatsApp/Messenger/Telegram no futuro) reutilizando a conexão Meta já existente (`meta_connections`, tokens de longa duração, OAuth funcional). Foco em usar apenas o que a **Instagram Graph API oficial** entrega para contas Business/Creator.

---

## 1. Escopo real das APIs oficiais (transparência)

O que a API oficial **entrega**:
- Perfil da conta conectada (username, nome, bio, foto, seguidores, nº de posts, categoria).
- Publicações, comentários e insights da conta conectada.
- **DMs**: apenas mensagens iniciadas pelo usuário nos últimos 7 dias (janela de mensageria da Meta), via Instagram Messaging API.
- Webhooks em tempo real para mensagens, comentários e menções.

O que a API **NÃO entrega** (e será tratado como "assistido manual"):
- Enviar DM para quem nunca falou com você (prospecção fria continua via link `ig.me`).
- Ler perfil público de terceiros com métricas privadas.

O painel deixará isso explícito para o usuário.

---

## 2. Banco de dados (nova migração)

Novas tabelas:
- `ig_accounts` — cache do perfil conectado (username, nome, bio, avatar, followers, media_count, category, last_synced_at, connection_id).
- `ig_conversations` — thread por lead (participant_igsid, participant_username, avatar, status, assignee_id, tags[], last_message_at, unread_count).
- `ig_messages` — mensagens (conversation_id, direction in/out, text, attachments jsonb, sent_at, mid, is_echo).
- `ig_comments` — comentários em posts (media_id, from_username, text, parent_id, replied).
- `ig_media_cache` — publicações sincronizadas (media_id, caption, media_type, permalink, thumbnail, timestamp, like_count, comments_count).
- `ig_events` — timeline de eventos por lead (tipo, payload, created_at) para o CRM.
- `ig_automations` — regras (trigger, conditions jsonb, actions jsonb, enabled).
- `ig_webhook_log` — auditoria de webhooks recebidos (verificação, deduplicação por mid).
- `ig_sync_log` — histórico de sincronizações (tipo, status, contagem, erro).

Extensões em tabelas existentes:
- `leads`: adicionar `ig_conversation_id` para linkar conversa ↔ lead automaticamente.

Todas com RLS por `user_id`, GRANTs para `authenticated` e `service_role`, updated_at trigger. Habilitar realtime em `ig_conversations`, `ig_messages`, `ig_events`.

---

## 3. Backend — funções e rotas

### `src/lib/instagram.functions.ts` (server functions autenticadas)
- `getIgAccount()` — retorna conta conectada + estatísticas.
- `syncIgProfile()` / `syncIgMedia()` / `syncIgInsights()` — sincronização manual sob demanda.
- `listConversations(filters)` / `getConversation(id)` / `getMessages(convId)`.
- `sendMessage(convId, text)` — usa Instagram Messaging API (respeita janela de 7 dias; retorna erro amigável se fora dela).
- `updateConversation(id, {status, assignee, tags})`.
- `promoteConversationToLead(convId)` — cria/liga registro em `leads`.
- `listAutomations()` / `upsertAutomation()` / `toggleAutomation()`.
- `getDashboardKpis()` — contas conectadas, conversas ativas, novos leads, tempo médio resposta, pendentes, conversões.
- `searchIg(query)` — busca em conversas/leads por @, nome, empresa, cidade, telefone, e-mail, tag, segmento.
- `aiConversationTools(convId, action)` — resumir, sugerir resposta, classificar intenção, próximos passos, gerar tarefa, priorizar (usa Gemini via Lovable AI).

### Rotas públicas (`src/routes/api/public/hooks/`)
- `ig-webhook.ts` — `GET` para verificação (`hub.challenge` + `META_APP_SECRET`); `POST` valida HMAC-SHA256 (`X-Hub-Signature-256`) com raw body, dedup por `mid`, persiste mensagens/comentários/menções, cria conversation se novo IGSID, dispara automações.
- `ig-sync.ts` — cron horário: sincroniza perfil, mídias, insights de todas as contas conectadas; grava em `ig_sync_log`.

### Cron
- `pg_cron` a cada hora chamando `ig-sync`.
- `pg_cron` a cada 15 min processando fila de automações pendentes.

---

## 4. Frontend — nova área "Instagram Hub"

Rotas em `src/routes/_authenticated/instagram.*`:

1. **`instagram.dashboard.tsx`** — KPIs (contas, conversas ativas, novos leads, tempo médio resposta, mensagens respondidas/pendentes, conversões, clientes originados). Gráficos com Recharts.

2. **`instagram.account.tsx`** — Conexão: card do perfil (avatar, @, nome, bio, link bio, categoria, seguidores, nº posts, status, última sync). Botões: Conectar, Reconectar, Sincronizar agora, Ver logs.

3. **`instagram.inbox.tsx`** — Central de conversas (layout 3 colunas):
   - Lista com filtros (status, responsável, tags, busca).
   - Thread central com mensagens, campo de resposta (bloqueado se fora da janela 7d com aviso), botões IA (resumir/sugerir).
   - Painel lateral do lead: foto, nome, @, link do perfil, cidade, empresa, telefone, e-mail, tags, notas, etapa do funil, timeline, tarefas.

4. **`instagram.crm.tsx`** — Kanban dos leads originados do IG por etapa do funil (drag & drop, reutiliza `pipeline_stage` da tabela `leads`).

5. **`instagram.comments.tsx`** — Comentários e menções em publicações, com resposta rápida.

6. **`instagram.automations.tsx`** — Builder visual de regras:
   - Triggers: `new_conversation`, `new_comment`, `keyword_match`, `mention`.
   - Ações: criar lead, atribuir responsável, mover no funil, criar tarefa, enviar resposta automática, notificar, aplicar tag.

7. **`instagram.admin.tsx`** — Painel admin: conexões, logs de webhook, logs de sync, consumo de API (contagem por hora), erros, botão reconectar.

Sidebar: novo grupo "Instagram Hub" com esses 7 itens, ícone `Instagram` (lucide).

---

## 5. IA integrada

Reutiliza Lovable AI Gateway (`google/gemini-2.5-flash`). Endpoints no `aiConversationTools`:
- **Resumo** da conversa em 3 bullets.
- **Sugestão de resposta** institucional (segue guia de marca já memorizado).
- **Classificação de intenção** (dúvida, orçamento, reclamação, elogio, spam).
- **Score do lead** (0–100) e canal recomendado.
- **Próximos passos** + geração automática de tarefas.
- **Priorização** da inbox por probabilidade de conversão.

---

## 6. Segurança

- Webhook: verificação HMAC obrigatória com `META_APP_SECRET`, rejeição 401 sem assinatura válida, dedup por `mid` para evitar replay.
- Tokens: já criptografados via `meta_connections`; renovação automática (long-lived 60d) e alerta no dashboard 7 dias antes de expirar.
- RLS estrito: cada usuário só vê suas próprias conversas/leads.
- Logs de auditoria em `ig_webhook_log` e `activity_logs`.
- Validação Zod em todas as inputs de server functions.
- `/api/public/hooks/*` sem PII em respostas.

---

## 7. Arquitetura modular (preparada para outros canais)

Camada de abstração `src/lib/channels/` com interface `ChannelAdapter`:
```
interface ChannelAdapter {
  channel: 'instagram' | 'whatsapp' | 'messenger' | 'telegram';
  sendMessage(convId, text): Promise<Result>;
  fetchConversations(): Promise<Conversation[]>;
  handleWebhook(payload): Promise<void>;
}
```
Instagram é o primeiro adapter. Tabelas de conversation/message ganham coluna `channel` para reaproveitamento futuro sem migração destrutiva.

---

## 8. Entrega em ordem

1. Migração SQL (tabelas + RLS + realtime + trigger).
2. Backend: adapter, functions, webhook, sync cron.
3. Frontend: sidebar + 7 rotas com skeleton loading e Framer Motion.
4. IA tools + automações.
5. Painel admin + logs.

---

## Observações técnicas ao usuário

- **Janela de 7 dias**: a Meta só permite enviar DM para quem enviou mensagem nesse prazo. Fora disso, botão "Abrir Direct manualmente" (já existente) continua sendo o caminho.
- **Webhook**: precisa registrar a URL `https://marketing.amtfightwear.com.br/api/public/hooks/ig-webhook` no App Meta e assinar os campos `messages`, `comments`, `mentions`. Instruções aparecerão na tela Admin.
- **Insights de seguidores/posts**: só disponíveis para contas Business/Creator vinculadas a uma Facebook Page (já é o caso da conexão atual).
