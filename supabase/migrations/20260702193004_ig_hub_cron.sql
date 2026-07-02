-- Instagram Hub sync cron (hourly at :20)
SELECT cron.unschedule('ig-hub-sync-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ig-hub-sync-hourly'
);
SELECT cron.schedule(
  'ig-hub-sync-hourly',
  '20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/ig-sync',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
