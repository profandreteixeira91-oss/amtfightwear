ALTER TABLE public.dojo_graduations ADD COLUMN IF NOT EXISTS applied_at timestamptz;

UPDATE public.dojo_graduations SET applied_at = COALESCE(applied_at, created_at) WHERE applied_at IS NULL;

CREATE INDEX IF NOT EXISTS dojo_graduations_pending_apply_idx
  ON public.dojo_graduations (graduation_date)
  WHERE applied_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('dojo-apply-scheduled-graduations');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'dojo-apply-scheduled-graduations',
  '5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/apply-scheduled-graduations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8'
    ),
    body := '{}'::jsonb
  );
  $cron$
);