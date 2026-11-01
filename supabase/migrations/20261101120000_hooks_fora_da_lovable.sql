-- Crons e triggers deixam de chamar o app publicado na Lovable.
--
-- Antes: cron/pg_net chamavam https://project--…lovable.app/api/public/hooks/* com a
-- anon key do projeto antigo da Lovable Cloud. Agora todos passam por
-- public.app_hook_post(app, hook), que lê do Vault a URL base de cada app e o
-- CRON_SECRET (aceito por checkInternalHookAuth no header x-cron-secret).
--
-- Pré-requisito (uma vez por ambiente, no SQL Editor — os valores NÃO vão para o Git):
--   select vault.create_secret('<mesmo valor do CRON_SECRET da hospedagem>', 'cron_secret');
--   select vault.create_secret('https://amtfightwear.com.br', 'store_base_url');
--   select vault.create_secret('https://dojomanager.amtfightwear.com.br', 'dojo_base_url');
-- Trocar de domínio depois (ex.: amtdojomanager.com.br) = vault.update_secret, sem migration.
-- Sem os segredos, app_hook_post só emite WARNING e não chama nada (falha fechada).

CREATE OR REPLACE FUNCTION public.app_hook_post(_app text, _hook text, _body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  _base text;
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _base FROM vault.decrypted_secrets WHERE name = _app || '_base_url';
  SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF _base IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'app_hook_post: % ou cron_secret ausente no Vault; hook % não chamado', _app || '_base_url', _hook;
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := rtrim(_base, '/') || '/api/public/hooks/' || _hook,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', _secret),
    body := _body
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.app_hook_post(text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Reaponta todos os jobs existentes que chamam /api/public/hooks/*, mantendo nome e horário.
-- Cobre também jobs criados fora das migrations (ex.: pelo painel da Lovable Cloud).
DO $do$
DECLARE
  r record;
  _hook text;
  _app text;
BEGIN
  FOR r IN SELECT jobid, jobname, command FROM cron.job WHERE command LIKE '%/api/public/hooks/%' LOOP
    _hook := substring(r.command FROM '/api/public/hooks/([a-z0-9-]+)');
    CONTINUE WHEN _hook IS NULL;
    IF _hook = 'auto-outreach' THEN
      -- A rota /api/public/hooks/auto-outreach não existe mais no app (só gerava 404).
      PERFORM cron.unschedule(r.jobid);
      CONTINUE;
    END IF;
    _app := CASE
      WHEN _hook IN (
        'generate-dojo-invoices', 'send-class-reminders', 'send-dojo-reminders',
        'dojo-wallet-reconcile', 'apply-scheduled-graduations', 'competitions-ingest'
      ) THEN 'dojo'
      ELSE 'store'
    END;
    PERFORM cron.alter_job(r.jobid, command := format('SELECT public.app_hook_post(%L, %L);', _app, _hook));
  END LOOP;
END
$do$;

-- Trigger de push da Central AMT: mesma lógica, só troca a chamada pg_net.
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
    PERFORM public.app_hook_post('store', 'admin-push', jsonb_build_object(
        'event', _event,
        'title', _title,
        'body',  _body,
        'url',   _url
      ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_amt_admin_push falhou (%): %', _event, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;
