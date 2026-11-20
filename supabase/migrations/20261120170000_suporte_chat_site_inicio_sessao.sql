-- Chat do site amtsistemas.com.br: a janela do visitante mostra só a conversa a partir do início da sessão.
--
-- Antes, a janela listava todas as mensagens da conversa do número informado. Quem digitasse o WhatsApp de outra
-- pessoa via o histórico dela com o suporte. Agora a Edge Function support-inbox filtra por started_at e guarda o
-- telefone da sessão (para juntar a resposta que o WhatsApp grava numa conversa @lid separada).
--
-- Sessões que já existem começam 1 minuto antes de criadas (a mensagem do visitante e a confirmação automática
-- são gravadas segundos antes da sessão).
--
-- Para desfazer: ALTER TABLE public.support_site_sessions DROP COLUMN started_at, DROP COLUMN phone_normalized.

alter table public.support_site_sessions add column if not exists started_at timestamptz;
alter table public.support_site_sessions add column if not exists phone_normalized text;

update public.support_site_sessions s set
  started_at = coalesce(s.started_at, s.created_at - interval '1 minute'),
  phone_normalized = coalesce(s.phone_normalized, c.phone_normalized)
from public.support_wa_chats c
where c.id = s.chat_id and (s.started_at is null or s.phone_normalized is null);

alter table public.support_site_sessions alter column started_at set default now();
alter table public.support_site_sessions alter column started_at set not null;
