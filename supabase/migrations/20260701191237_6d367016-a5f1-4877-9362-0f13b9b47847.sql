
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('auto-outreach-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-outreach-hourly'
);

SELECT cron.schedule(
  'auto-outreach-hourly',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/auto-outreach',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
