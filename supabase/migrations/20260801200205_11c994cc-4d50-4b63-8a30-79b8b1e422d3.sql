CREATE TABLE IF NOT EXISTS public.store_admin_notification_prefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_admin_notification_prefs TO authenticated;
GRANT ALL ON public.store_admin_notification_prefs TO service_role;

ALTER TABLE public.store_admin_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user manages own admin notif prefs" ON public.store_admin_notification_prefs;
CREATE POLICY "user manages own admin notif prefs"
ON public.store_admin_notification_prefs
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_admin_notif_prefs_touch ON public.store_admin_notification_prefs;
CREATE TRIGGER trg_admin_notif_prefs_touch
BEFORE UPDATE ON public.store_admin_notification_prefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_amt_admin_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _event text := TG_ARGV[0];
  _title text;
  _body  text;
  _url   text := '/admin';
BEGIN
  IF _event = 'store_order.new' THEN
    _title := 'Novo pedido AMT Fight Wear';
    _body  := coalesce(NEW.customer_name, NEW.customer_email, 'Cliente')
              || ' · R$ ' || to_char(coalesce(NEW.total,0), 'FM999G999D00');
    _url   := '/admin/pedidos';
  ELSIF _event = 'store_order.paid' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.status IN ('paid','confirmed','approved','completed')
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      _title := 'Pagamento aprovado';
      _body  := 'Pedido de ' || coalesce(NEW.customer_name, NEW.customer_email, 'cliente')
                || ' — R$ ' || to_char(coalesce(NEW.total,0), 'FM999G999D00');
      _url   := '/admin/pedidos';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF _event = 'sales_message.new' THEN
    IF coalesce(NEW.role,'') NOT IN ('user','customer') THEN RETURN NEW; END IF;
    _title := 'Nova mensagem no chat da loja';
    _body  := 'Um cliente enviou uma mensagem';
    _url   := '/admin/atendimento';
  ELSIF _event = 'dojo_support.new' THEN
    IF coalesce(NEW.author_role,'') <> 'client' THEN RETURN NEW; END IF;
    _title := 'Suporte Dojo — nova mensagem';
    _body  := left(coalesce(NEW.body,''), 160);
    _url   := '/store/dojo-support';
  ELSIF _event = 'profile.new' THEN
    _title := 'Novo cadastro';
    _body  := coalesce(NEW.full_name, NEW.email, 'Novo usuário se cadastrou');
    _url   := '/admin/clientes';
  ELSIF _event = 'dojo_sub.new' THEN
    _title := 'Novo dojo no sistema';
    _body  := 'Uma nova academia iniciou trial no Dojo Manager';
    _url   := '/admin/dojo';
  ELSIF _event = 'dojo_sub.change' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    _title := 'Assinatura Dojo — ' || coalesce(NEW.status,'atualizada');
    _body  := 'Status alterado de ' || coalesce(OLD.status,'—') || ' para ' || coalesce(NEW.status,'—');
    _url   := '/admin/dojo';
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/admin-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8'
      ),
      body := jsonb_build_object(
        'event', _event,
        'title', _title,
        'body',  _body,
        'url',   _url
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_amt_admin_push falhou (%): %', _event, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;