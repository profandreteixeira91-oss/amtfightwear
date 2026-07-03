-- Extra columns for real Meta Ads publishing
ALTER TABLE public.ads_campaigns
  ADD COLUMN IF NOT EXISTS meta_adset_id text,
  ADD COLUMN IF NOT EXISTS meta_ad_id text,
  ADD COLUMN IF NOT EXISTS meta_creative_id text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Prevent duplicate insight rows per campaign/day for upsert
CREATE UNIQUE INDEX IF NOT EXISTS ads_insights_campaign_date_idx
  ON public.ads_insights (campaign_id, date);

-- Service role for cron endpoint (Vault)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'ads_sync_service_role_key') THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'ads_sync_service_role_key',
      'Service role used by pg_cron to trigger ads insights sync'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- pg_cron + pg_net (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule insights sync every 3 hours
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ads-insights-sync') THEN
    PERFORM cron.unschedule('ads-insights-sync');
  END IF;
  PERFORM cron.schedule(
    'ads-insights-sync',
    '0 */3 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/sync-ads-insights',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;