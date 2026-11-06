-- Chat do site amtsistemas.com.br ligado ao WhatsApp do suporte (instância amt-suporte, número 551151040791).
--
-- O visitante abre o chat no site e informa nome, WhatsApp e mensagem. A Edge Function support-inbox manda do
-- número do suporte uma confirmação para o WhatsApp dele (citando a mensagem); a partir daí a conversa existe no
-- WhatsApp: aparece no celular do suporte e no /admin, e a janela do site mostra a conversa ao vivo.
--
-- - support_wa_messages.source: whatsapp (padrão) | site (digitada na janela do site) | auto (confirmação
--   automática) | relay (cópia da mensagem do site enviada ao WhatsApp, só para o celular ter o contexto).
-- - support_wa_messages.hidden: não aparece no /admin nem na janela do site (as cópias "relay").
-- - support_site_sessions: sessões da janela do site (token guardado só como hash) e limite por IP.
--
-- Para desfazer: DROP TABLE public.support_site_sessions; ALTER TABLE public.support_wa_messages
--   DROP COLUMN hidden, DROP COLUMN source; e recriar support_wa_messages_touch_chat da migration 20261106180000.

alter table public.support_wa_messages add column if not exists source text not null default 'whatsapp';
alter table public.support_wa_messages add column if not exists hidden boolean not null default false;

create table if not exists public.support_site_sessions (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.support_wa_chats(id) on delete cascade,
  token_hash text not null unique,
  ip_hash text,
  visitor_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists support_site_sessions_ip_idx on public.support_site_sessions (ip_hash, created_at desc);
create index if not exists support_site_sessions_chat_idx on public.support_site_sessions (chat_id);
alter table public.support_site_sessions enable row level security;

-- Cópias ocultas e a confirmação automática não mexem na conversa (prévia, não lidas).
create or replace function public.support_wa_messages_touch_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hidden or new.source in ('auto', 'relay') then
    return null;
  end if;
  update public.support_wa_chats c set
    last_message_at = new.sent_at,
    last_message_preview = left(coalesce(new.body, case new.type
      when 'image' then '📷 Foto' when 'audio' then '🎤 Áudio' when 'video' then '🎬 Vídeo'
      when 'document' then '📄 ' || coalesce(new.media_name, 'Documento') when 'sticker' then 'Figurinha'
      else 'Mensagem' end), 160),
    last_message_from_me = new.from_me,
    -- Resposta do suporte zera as não lidas; mensagem recebida soma uma e tira do arquivo.
    unread_count = case when new.from_me then 0 else c.unread_count + 1 end,
    archived = case when new.from_me then c.archived else false end
  where c.id = new.chat_id and (c.last_message_at is null or c.last_message_at <= new.sent_at);
  return null;
end $$;
