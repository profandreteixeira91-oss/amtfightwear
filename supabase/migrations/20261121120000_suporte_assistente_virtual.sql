-- Assistente Virtual AMT Sistemas (bot de regras no WhatsApp do suporte, Edge Function support-inbox).
--
-- - support_wa_chats.bot_state: etapa do fluxo e respostas do diagnóstico ({step, path, answers, invalid, updated_at}).
-- - support_wa_chats.bot_last_in: última mensagem recebida já tratada pelo bot (evita responder duas vezes à mesma).
-- - support_wa_chats.bot_handoff_at: quando o bot passou a conversa para um atendente (fica quieto por 24 h).
-- - support_wa_chats.bot_paused_until: pausa manual pelo /admin (2999-12-31 = até retomar).
-- - support_wa_messages.source = 'bot': mensagens do assistente. Atualizam a prévia da conversa, mas NÃO zeram as
--   não lidas: as conversas atendidas pelo bot continuam aparecendo para o atendente no /admin.
-- - app_settings 'support_whatsapp_bot': {"enabled": bool}. Começa desligado; liga-se pelo /admin.
--
-- Reverter: drop das quatro colunas e recriar support_wa_messages_touch_chat da migration 20261106210000.

alter table public.support_wa_chats add column if not exists bot_state jsonb;
alter table public.support_wa_chats add column if not exists bot_last_in text;
alter table public.support_wa_chats add column if not exists bot_handoff_at timestamptz;
alter table public.support_wa_chats add column if not exists bot_paused_until timestamptz;

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
    -- Resposta do suporte zera as não lidas (a do assistente virtual não); mensagem recebida soma uma e tira do arquivo.
    unread_count = case when new.from_me and new.source <> 'bot' then 0 when new.from_me then c.unread_count else c.unread_count + 1 end,
    archived = case when new.from_me then c.archived else false end
  where c.id = new.chat_id and (c.last_message_at is null or c.last_message_at <= new.sent_at);
  return null;
end $$;

insert into public.app_settings (key, value)
values ('support_whatsapp_bot', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
