
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Tabela de inscrições
CREATE TABLE IF NOT EXISTS public.store_admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_admin_push_subscriptions TO authenticated;
GRANT ALL ON public.store_admin_push_subscriptions TO service_role;
ALTER TABLE public.store_admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user manages own admin push subs" ON public.store_admin_push_subscriptions;
CREATE POLICY "user manages own admin push subs" ON public.store_admin_push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_admin_push_user ON public.store_admin_push_subscriptions(user_id);

DROP TRIGGER IF EXISTS trg_admin_push_touch ON public.store_admin_push_subscriptions;
CREATE TRIGGER trg_admin_push_touch BEFORE UPDATE ON public.store_admin_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Função genérica que dispara HTTP POST ao endpoint interno
CREATE OR REPLACE FUNCTION public.notify_amt_admin_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _event text := TG_ARGV[0];
  _title text;
  _body  text;
  _url   text := '/store';
BEGIN
  IF _event = 'store_order.new' THEN
    _title := 'Novo pedido AMT Fight Wear';
    _body  := coalesce(NEW.customer_name, NEW.customer_email, 'Cliente')
              || ' · R$ ' || to_char(coalesce(NEW.total,0), 'FM999G999D00');
    _url   := '/store/orders';
  ELSIF _event = 'store_order.paid' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.status IN ('paid','confirmed','approved','completed')
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      _title := 'Pagamento aprovado';
      _body  := 'Pedido de ' || coalesce(NEW.customer_name, NEW.customer_email, 'cliente')
                || ' — R$ ' || to_char(coalesce(NEW.total,0), 'FM999G999D00');
      _url   := '/store/orders';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF _event = 'sales_message.new' THEN
    IF coalesce(NEW.role,'') NOT IN ('user','customer') THEN RETURN NEW; END IF;
    _title := 'Nova mensagem no chat da loja';
    _body  := 'Um cliente enviou uma mensagem';
    _url   := '/store/chat';
  ELSIF _event = 'dojo_support.new' THEN
    IF coalesce(NEW.author_role,'') <> 'client' THEN RETURN NEW; END IF;
    _title := 'Suporte Dojo — nova mensagem';
    _body  := left(coalesce(NEW.body,''), 160);
    _url   := '/store/dojo-support';
  ELSIF _event = 'profile.new' THEN
    _title := 'Novo cadastro';
    _body  := coalesce(NEW.full_name, NEW.email, 'Novo usuário se cadastrou');
    _url   := '/store/customers';
  ELSIF _event = 'dojo_sub.new' THEN
    _title := 'Novo dojo no sistema';
    _body  := 'Uma nova academia iniciou trial no Dojo Manager';
    _url   := '/store/dojo-manager';
  ELSIF _event = 'dojo_sub.change' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    _title := 'Assinatura Dojo — ' || coalesce(NEW.status,'atualizada');
    _body  := 'Status alterado de ' || coalesce(OLD.status,'—') || ' para ' || coalesce(NEW.status,'—');
    _url   := '/store/dojo-manager';
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
$$;

-- 3. Gatilhos
DROP TRIGGER IF EXISTS trg_push_store_order_new ON public.store_orders;
CREATE TRIGGER trg_push_store_order_new
  AFTER INSERT ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('store_order.new');

DROP TRIGGER IF EXISTS trg_push_store_order_paid ON public.store_orders;
CREATE TRIGGER trg_push_store_order_paid
  AFTER UPDATE OF status ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('store_order.paid');

DROP TRIGGER IF EXISTS trg_push_sales_message ON public.sales_messages;
CREATE TRIGGER trg_push_sales_message
  AFTER INSERT ON public.sales_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('sales_message.new');

DROP TRIGGER IF EXISTS trg_push_dojo_support ON public.dojo_support_messages;
CREATE TRIGGER trg_push_dojo_support
  AFTER INSERT ON public.dojo_support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('dojo_support.new');

DROP TRIGGER IF EXISTS trg_push_profile_new ON public.profiles;
CREATE TRIGGER trg_push_profile_new
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('profile.new');

DROP TRIGGER IF EXISTS trg_push_dojo_sub_new ON public.dojo_subscriptions;
CREATE TRIGGER trg_push_dojo_sub_new
  AFTER INSERT ON public.dojo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('dojo_sub.new');

DROP TRIGGER IF EXISTS trg_push_dojo_sub_change ON public.dojo_subscriptions;
CREATE TRIGGER trg_push_dojo_sub_change
  AFTER UPDATE OF status ON public.dojo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_amt_admin_push('dojo_sub.change');
