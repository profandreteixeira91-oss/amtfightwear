-- Alertas do Control Center da AMT (amtsistemas.com.br/admin) para o atendimento do suporte.
--
-- public.admin_notify() chama a Edge Function admin-push do projeto amt-sistemas pelo pg_net, com o segredo
-- guardado no Vault deste projeto (nome 'admin_push_secret'; criado fora da migration). Sem o segredo, nada é
-- enviado. Geram alerta:
-- - mensagem recebida no WhatsApp do suporte ou no chat do site (support_wa_messages, de fora, não oculta);
-- - mensagem do cliente num chamado do Dojo Manager (dojo_support_messages, author_role = client).
-- Mensagens antigas (importação de histórico) não avisam: só as enviadas nos últimos 5 minutos.
-- Idempotente.

create or replace function public.admin_notify(p_title text, p_body text, p_url text, p_tag text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'admin_push_secret' limit 1;
  if v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://yqxmxevphdumyuwlvppg.supabase.co/functions/v1/admin-push',
    headers := jsonb_build_object('content-type', 'application/json', 'x-admin-push-secret', v_secret),
    body := jsonb_build_object('title', left(p_title, 120), 'body', left(coalesce(p_body, ''), 300), 'url', p_url, 'tag', p_tag)
  );
end $$;

revoke all on function public.admin_notify(text, text, text, text) from public, anon, authenticated;

create or replace function public.support_wa_messages_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat public.support_wa_chats%rowtype;
  v_name text;
begin
  if new.from_me or new.hidden or new.source not in ('whatsapp', 'site') or new.sent_at < now() - interval '5 minutes' then
    return null;
  end if;
  select * into v_chat from public.support_wa_chats where id = new.chat_id;
  select coalesce(nullif(p.trade_name, ''), nullif(p.legal_name, '')) into v_name
  from public.dojo_academy_profile p where p.owner_id = v_chat.academy_owner_id;
  perform public.admin_notify(
    case when new.source = 'site' then 'Chat do site · ' else 'WhatsApp · ' end
      || coalesce(v_name, v_chat.name, '+' || v_chat.phone_normalized, 'Contato'),
    coalesce(new.body, case new.type when 'image' then '📷 Foto' when 'audio' then '🎤 Áudio' when 'video' then '🎬 Vídeo'
      when 'document' then '📄 Documento' else 'Nova mensagem' end),
    '/admin/whatsapp?conversa=' || new.chat_id,
    'wa-' || new.chat_id
  );
  return null;
end $$;

drop trigger if exists support_wa_messages_notify_admin on public.support_wa_messages;
create trigger support_wa_messages_notify_admin after insert on public.support_wa_messages
  for each row execute function public.support_wa_messages_notify_admin();

create or replace function public.dojo_support_messages_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.dojo_support_tickets%rowtype;
  v_name text;
begin
  if new.author_role <> 'client' or new.created_at < now() - interval '5 minutes' then
    return null;
  end if;
  select * into v_ticket from public.dojo_support_tickets where id = new.ticket_id;
  select coalesce(nullif(trade_name, ''), nullif(legal_name, ''), 'Academia') into v_name
  from public.dojo_academy_profile where owner_id = v_ticket.owner_id;
  perform public.admin_notify(
    'Chamado #' || left(new.ticket_id::text, 8) || ' · ' || coalesce(v_name, 'Academia'),
    coalesce(v_ticket.subject || ': ', '') || new.body,
    '/admin/whatsapp?conversa=t:' || new.ticket_id,
    'ticket-' || new.ticket_id
  );
  return null;
end $$;

drop trigger if exists dojo_support_messages_notify_admin on public.dojo_support_messages;
create trigger dojo_support_messages_notify_admin after insert on public.dojo_support_messages
  for each row execute function public.dojo_support_messages_notify_admin();
