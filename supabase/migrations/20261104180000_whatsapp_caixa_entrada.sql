-- Commercial Flow — Fase 4: caixa de entrada do WhatsApp no /admin.
--
-- Guarda as conversas e mensagens do número da loja (Evolution API, instância amt-loja)
-- para atender pelo admin. A Evolution continua sendo a única integração: as mensagens
-- chegam pelo webhook dela e saem pela mesma API dos avisos de pedido.
--
-- O WhatsApp identifica muitos contatos só por um código de privacidade (@lid), sem o
-- telefone. Por isso a conversa guarda o identificador (remote_jid) e, quando se sabe,
-- o telefone; o cliente é ligado pelo telefone ou manualmente no admin.
--
-- Para desfazer: DROP TABLE public.whatsapp_messages; DROP TABLE public.whatsapp_chats;
--   DROP FUNCTION public.whatsapp_chats_link_customer(); DROP FUNCTION public.customers_link_whatsapp();
--   DROP FUNCTION public.whatsapp_messages_touch_chat();

CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_jid text NOT NULL UNIQUE,
  phone_normalized text,
  name text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_from_me boolean,
  unread_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  archived boolean NOT NULL DEFAULT false,
  follow_up_at date,
  follow_up_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_chats_last_message_idx ON public.whatsapp_chats (last_message_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_chats_phone_idx ON public.whatsapp_chats (phone_normalized);
CREATE INDEX IF NOT EXISTS whatsapp_chats_customer_idx ON public.whatsapp_chats (customer_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  message_id text NOT NULL UNIQUE,
  from_me boolean NOT NULL,
  type text NOT NULL DEFAULT 'text',
  body text,
  media_mime text,
  media_name text,
  quoted_body text,
  status text,
  sent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_messages_chat_idx ON public.whatsapp_messages (chat_id, sent_at DESC);

DROP TRIGGER IF EXISTS whatsapp_chats_updated_at ON public.whatsapp_chats;
CREATE TRIGGER whatsapp_chats_updated_at BEFORE UPDATE ON public.whatsapp_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Conversa com telefone conhecido → liga ao cliente com o mesmo telefone.
CREATE OR REPLACE FUNCTION public.whatsapp_chats_link_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL AND NEW.phone_normalized IS NOT NULL THEN
    SELECT id INTO NEW.customer_id FROM public.customers WHERE phone_normalized = NEW.phone_normalized LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_chats_link_customer ON public.whatsapp_chats;
CREATE TRIGGER whatsapp_chats_link_customer BEFORE INSERT OR UPDATE OF phone_normalized ON public.whatsapp_chats
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_chats_link_customer();

-- Cliente com telefone novo → liga as conversas desse telefone ainda sem cliente.
CREATE OR REPLACE FUNCTION public.customers_link_whatsapp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.phone_normalized IS NOT NULL THEN
    UPDATE public.whatsapp_chats SET customer_id = NEW.id
    WHERE phone_normalized = NEW.phone_normalized AND customer_id IS NULL;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS customers_link_whatsapp ON public.customers;
CREATE TRIGGER customers_link_whatsapp AFTER INSERT OR UPDATE OF phone ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_link_whatsapp();

-- Mensagem nova atualiza a conversa (prévia, não lidas) e o último contato do cliente.
CREATE OR REPLACE FUNCTION public.whatsapp_messages_touch_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_customer uuid;
BEGIN
  UPDATE public.whatsapp_chats c SET
    last_message_at = NEW.sent_at,
    last_message_preview = left(coalesce(NEW.body, CASE NEW.type
      WHEN 'image' THEN '📷 Foto' WHEN 'audio' THEN '🎤 Áudio' WHEN 'video' THEN '🎬 Vídeo'
      WHEN 'document' THEN '📄 ' || coalesce(NEW.media_name, 'Documento') WHEN 'sticker' THEN 'Figurinha'
      ELSE 'Mensagem' END), 160),
    last_message_from_me = NEW.from_me,
    -- Resposta da loja zera as não lidas; mensagem recebida soma uma.
    unread_count = CASE WHEN NEW.from_me THEN 0 ELSE c.unread_count + 1 END,
    archived = CASE WHEN NEW.from_me THEN c.archived ELSE false END
  WHERE c.id = NEW.chat_id AND (c.last_message_at IS NULL OR c.last_message_at <= NEW.sent_at)
  RETURNING c.customer_id INTO v_customer;
  IF v_customer IS NOT NULL THEN
    UPDATE public.customers SET last_contact_at = greatest(last_contact_at, NEW.sent_at) WHERE id = v_customer;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS whatsapp_messages_touch_chat ON public.whatsapp_messages;
CREATE TRIGGER whatsapp_messages_touch_chat AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_messages_touch_chat();

-- Só o dono da loja (o servidor usa service_role e não passa por RLS).
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.whatsapp_chats;
CREATE POLICY "Dono da loja gerencia" ON public.whatsapp_chats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
DROP POLICY IF EXISTS "Dono da loja gerencia" ON public.whatsapp_messages;
CREATE POLICY "Dono da loja gerencia" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'amt_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'amt_admin'::public.app_role));
