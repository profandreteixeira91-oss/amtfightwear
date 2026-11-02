-- Rotinas automáticas do Dojo Manager (novas, sem Lovable).
--
-- O pg_cron chama os hooks internos do app do Dojo Manager via pg_net, com o
-- header x-cron-secret (checkInternalHookAuth no app). A URL base e o segredo
-- ficam no Vault — os valores NÃO vão para o Git. Uma vez por ambiente, no SQL
-- Editor:
--   select vault.create_secret('<mesmo valor do CRON_SECRET do Worker>', 'cron_secret');
--   select vault.create_secret('https://teste.amtsistemas.com.br', 'dojo_base_url');
-- Trocar de domínio depois = vault.update_secret no 'dojo_base_url', sem migration.
-- Sem os dois segredos, dojo_hook_post só emite WARNING e não chama nada.
--
-- Horários (UTC) iguais aos que rodavam até 30/10/2026:
--   mensalidades 07:00 (04:00 Brasília) · lembretes de mensalidade 12:00 (09:00)
--   lembretes de aula a cada 5 min (janela de ±3 min no app)
--   graduações agendadas e assinaturas: de hora em hora, no minuto 5
--   carteira AMT Pay: de hora em hora · competições: a cada 6 h

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dojo_hook_post(_hook text, _body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  _base text;
  _secret text;
BEGIN
  IF _hook IS NULL OR _hook !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'dojo_hook_post: hook inválido %', _hook;
  END IF;
  SELECT decrypted_secret INTO _base FROM vault.decrypted_secrets WHERE name = 'dojo_base_url';
  SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF _base IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'dojo_hook_post: dojo_base_url ou cron_secret ausente no Vault; hook % não chamado', _hook;
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := rtrim(_base, '/') || '/api/public/hooks/' || _hook,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', _secret),
    body := coalesce(_body, '{}'::jsonb),
    timeout_milliseconds := 60000
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.dojo_hook_post(text, jsonb) FROM PUBLIC, anon, authenticated;

-- (Re)agenda com nomes fixos: rodar de novo esta migration não duplica jobs.
DO $do$
DECLARE
  j record;
BEGIN
  FOR j IN
    SELECT * FROM (VALUES
      ('dojo-generate-invoices',           '0 7 * * *',    'generate-dojo-invoices'),
      ('dojo-send-invoice-reminders',      '0 12 * * *',   'send-dojo-reminders'),
      ('dojo-send-class-reminders',        '*/5 * * * *',  'send-class-reminders'),
      ('dojo-apply-scheduled-graduations', '5 * * * *',    'apply-scheduled-graduations'),
      ('dojo-wallet-reconcile',            '0 * * * *',    'dojo-wallet-reconcile'),
      ('dojo-competitions-ingest',         '0 */6 * * *',  'competitions-ingest')
    ) AS t(jobname, schedule, hook)
  LOOP
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = j.jobname;
    PERFORM cron.schedule(j.jobname, j.schedule, format('SELECT public.dojo_hook_post(%L);', j.hook));
  END LOOP;
END
$do$;
