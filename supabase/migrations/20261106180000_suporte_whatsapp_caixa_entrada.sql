-- Caixa de entrada do WhatsApp do suporte AMT (Evolution, instância amt-suporte) no Control Center
-- (amtsistemas.com.br/admin), no mesmo formato da caixa da loja (whatsapp_chats / whatsapp_messages), mas
-- separada dela: aqui a "ficha" do contato é a academia do Dojo Manager.
--
-- Quem grava e lê é só a Edge Function support-inbox (service_role): RLS ligada e sem políticas.
-- academy_owner_id não tem FK para auth.users de propósito: a conversa não deve segurar o login de uma
-- academia excluída (platform_dojo_account_deletion trata FK para auth.users como vínculo em uso).
--
-- Para desfazer: DROP TABLE public.support_wa_messages; DROP TABLE public.support_wa_chats;
--   DROP FUNCTION public.support_wa_messages_touch_chat(); DROP FUNCTION public.support_wa_chats_link_academy();
--   DROP FUNCTION public.support_wa_normalize_phone(text);

-- Telefone em dígitos com DDI 55 (mesma regra de normalizeWhatsAppNumber).
create or replace function public.support_wa_normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when d = '' then null
    when d like '55%' and length(d) between 12 and 13 then d
    when length(d) in (10, 11) then '55' || d
    when length(d) >= 12 then d
    else null
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

create table if not exists public.support_wa_chats (
  id uuid primary key default gen_random_uuid(),
  remote_jid text not null unique,
  phone_normalized text,
  name text,
  academy_owner_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_from_me boolean,
  unread_count integer not null default 0,
  tags text[] not null default '{}',
  archived boolean not null default false,
  follow_up_at date,
  follow_up_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_wa_chats_last_message_idx on public.support_wa_chats (last_message_at desc);
create index if not exists support_wa_chats_phone_idx on public.support_wa_chats (phone_normalized);
create index if not exists support_wa_chats_academy_idx on public.support_wa_chats (academy_owner_id);

create table if not exists public.support_wa_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.support_wa_chats(id) on delete cascade,
  message_id text not null unique,
  from_me boolean not null,
  type text not null default 'text',
  body text,
  media_mime text,
  media_name text,
  quoted_body text,
  status text,
  sent_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists support_wa_messages_chat_idx on public.support_wa_messages (chat_id, sent_at desc);

drop trigger if exists support_wa_chats_updated_at on public.support_wa_chats;
create trigger support_wa_chats_updated_at before update on public.support_wa_chats
  for each row execute function public.set_updated_at();

-- Conversa com telefone conhecido → liga à academia com o mesmo WhatsApp/telefone no perfil.
create or replace function public.support_wa_chats_link_academy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.academy_owner_id is null and new.phone_normalized is not null then
    select p.owner_id into new.academy_owner_id
    from public.dojo_academy_profile p
    where public.support_wa_normalize_phone(p.whatsapp) = new.phone_normalized
       or public.support_wa_normalize_phone(p.phone) = new.phone_normalized
    limit 1;
  end if;
  return new;
end $$;
drop trigger if exists support_wa_chats_link_academy on public.support_wa_chats;
create trigger support_wa_chats_link_academy before insert or update of phone_normalized on public.support_wa_chats
  for each row execute function public.support_wa_chats_link_academy();

-- Mensagem nova atualiza a conversa (prévia, não lidas, arquivamento).
create or replace function public.support_wa_messages_touch_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
drop trigger if exists support_wa_messages_touch_chat on public.support_wa_messages;
create trigger support_wa_messages_touch_chat after insert on public.support_wa_messages
  for each row execute function public.support_wa_messages_touch_chat();

alter table public.support_wa_chats enable row level security;
alter table public.support_wa_messages enable row level security;
