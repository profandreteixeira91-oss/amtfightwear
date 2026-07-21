
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('dojo-wallet-reconcile-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'dojo-wallet-reconcile-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/dojo-wallet-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
