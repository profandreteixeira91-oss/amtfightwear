## Objetivo

Enviar as mensagens de captação de leads (DM do Instagram) direto do painel administrativo, sem precisar abrir o app/site do Instagram para colar a mensagem.

## Limitação da Meta (importante ler antes)

A Graph API do Instagram **só permite enviar DMs para pessoas que já iniciaram uma conversa com o seu perfil** (janela de 24h/7 dias). Cold DMs (você iniciar do zero para um estranho) **não são permitidos pela Meta** — nenhuma integração oficial contorna isso. Então o comportamento realista é:

- **Lead que já mandou DM alguma vez** (existe em `ig_conversations`) → envio 100% pelo painel, sem sair.
- **Lead novo, que nunca respondeu** → precisa de um primeiro toque manual (limitação da plataforma). Vamos manter o atalho `ig.me` com a mensagem já copiada, e assim que ele responder, entra automaticamente no fluxo do inbox.

## Mudanças

### 1. Nova server function `sendLeadOutreachDm` (`src/lib/ig-hub.functions.ts`)

Recebe `{ igHandle, text, leadId? }` e:

1. Procura em `ig_conversations` uma conversa com `participant_username` = handle (case-insensitive) para o usuário.
2. Se achou e a janela de 7 dias está válida:
   - Envia via Graph API (endpoint `/{page-id}/messages` com fallback para `/{ig-user-id}/messages`, mesma lógica do `sendMessage` atual).
   - Insere linha em `ig_messages` (direction=out), atualiza `last_message_at`/`preview` e `ig_events`.
   - Registra em `prospect_timeline` (event_type = `dm_sent`) vinculado ao `leadId`.
   - Retorna `{ status: "sent", conversationId }`.
3. Se não achou conversa **ou** janela expirou:
   - Retorna `{ status: "needs_manual", igMeUrl: "https://ig.me/m/<handle>" }` explicando o motivo.

### 2. UI em `prospect.qualified.tsx`

- Substituir o botão "Abrir Instagram e copiar mensagem" por **"Enviar DM pelo painel"**.
- Ao clicar:
  - Se `status = sent` → toast de sucesso, fecha o dialog, invalida a query do inbox.
  - Se `status = needs_manual` → mostra aviso curto ("Este lead ainda não iniciou uma conversa — o Instagram só permite envio depois do primeiro contato") e habilita o botão secundário **"Abrir no Instagram"** que copia a mensagem e abre `ig.me` (fluxo atual, agora como fallback).
- Indicador visual na linha da tabela: badge verde "Inbox conectado" quando existe conversa para aquele handle (uma query leve que retorna o set de usernames com conversa ativa).

### 3. Integração cruzada leve

- No `syncIgInbox`, quando uma nova conversa for criada e o `participant_username` bater com o Instagram de um lead existente, popular `ig_conversations.lead_id` automaticamente. Assim as respostas dos leads aparecem já vinculadas no inbox.

## Arquivos afetados

- `src/lib/ig-hub.functions.ts` — nova função + link automático com `prospect_companies`.
- `src/routes/_authenticated/prospect.qualified.tsx` — novo botão, novo estado, badge de status.
- (opcional) `src/routes/_authenticated/instagram.inbox.tsx` — sem mudança de código; herda os benefícios via `router.invalidate()`.

## Resultado prático

- Para leads que já responderam alguma vez: você digita a mensagem, clica "Enviar" e o DM sai — a conversa aparece atualizada no inbox e na timeline do lead, sem abrir o Instagram.
- Para leads totalmente frios (limitação Meta): 1 clique abre `ig.me` com a mensagem já copiada; a partir da 1ª resposta dele, todo o resto vira envio direto pelo painel.