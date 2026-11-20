-- Chat do site da loja (amtfightwear.com.br) ligado ao WhatsApp da loja (Evolution, instância amt-loja).
--
-- Mesmo funcionamento do "Fale conosco" da AMT Sistemas: o visitante abre o chat no site e informa nome, WhatsApp e
-- mensagem. O servidor manda do número da loja uma confirmação para o WhatsApp dele (citando a mensagem); a partir
-- daí a conversa existe no WhatsApp: aparece no celular da loja e no /admin/whatsapp, e a janela do site mostra a
-- conversa ao vivo.
--
-- - whatsapp_messages.source: whatsapp (padrão) | site (digitada na janela do site) | auto (confirmação
--   automática) | relay (cópia da mensagem do site enviada ao WhatsApp, só para o celular ter o contexto).
-- - whatsapp_messages.hidden: não aparece no /admin nem na janela do site (as cópias "relay").
-- - whatsapp_site_sessions: sessões da janela do site (token guardado só como hash) e limite por IP. A janela só
--   mostra mensagens a partir de started_at, nunca o histórico anterior do número.
--
-- Para desfazer: DROP TABLE public.whatsapp_site_sessions; ALTER TABLE public.whatsapp_messages
--   DROP COLUMN hidden, DROP COLUMN source; e recriar whatsapp_messages_touch_chat da migration 20261104180000.

alter table public.whatsapp_messages add column if not exists source text not null default 'whatsapp';
alter table public.whatsapp_messages add column if not exists hidden boolean not null default false;

create table if not exists public.whatsapp_site_sessions (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.whatsapp_chats(id) on delete cascade,
  token_hash text not null unique,
  ip_hash text,
  visitor_name text,
  phone_normalized text,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists whatsapp_site_sessions_ip_idx on public.whatsapp_site_sessions (ip_hash, created_at desc);
create index if not exists whatsapp_site_sessions_chat_idx on public.whatsapp_site_sessions (chat_id);
-- Só o servidor (service_role) lê e grava.
alter table public.whatsapp_site_sessions enable row level security;

-- Cópias ocultas e a confirmação automática não mexem na conversa (prévia, não lidas).
create or replace function public.whatsapp_messages_touch_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_customer uuid;
begin
  if new.hidden or new.source in ('auto', 'relay') then
    return null;
  end if;
  update public.whatsapp_chats c set
    last_message_at = new.sent_at,
    last_message_preview = left(coalesce(new.body, case new.type
      when 'image' then '📷 Foto' when 'audio' then '🎤 Áudio' when 'video' then '🎬 Vídeo'
      when 'document' then '📄 ' || coalesce(new.media_name, 'Documento') when 'sticker' then 'Figurinha'
      else 'Mensagem' end), 160),
    last_message_from_me = new.from_me,
    -- Resposta da loja zera as não lidas; mensagem recebida soma uma.
    unread_count = case when new.from_me then 0 else c.unread_count + 1 end,
    archived = case when new.from_me then c.archived else false end
  where c.id = new.chat_id and (c.last_message_at is null or c.last_message_at <= new.sent_at)
  returning c.customer_id into v_customer;
  if v_customer is not null then
    update public.customers set last_contact_at = greatest(last_contact_at, new.sent_at) where id = v_customer;
  end if;
  return null;
end $$;
