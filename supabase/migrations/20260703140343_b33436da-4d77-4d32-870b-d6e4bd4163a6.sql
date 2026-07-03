-- A/B Tests
CREATE TABLE IF NOT EXISTS public.ads_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  hypothesis text,
  status text NOT NULL DEFAULT 'running',
  winner_variant_id uuid,
  metric text NOT NULL DEFAULT 'roas',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_ab_tests TO authenticated;
GRANT ALL ON public.ads_ab_tests TO service_role;
ALTER TABLE public.ads_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ab tests" ON public.ads_ab_tests FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ads_ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.ads_ab_tests(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_control boolean NOT NULL DEFAULT false,
  copy_id uuid,
  creative_id uuid,
  meta_ad_id text,
  meta_creative_id text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_ab_variants TO authenticated;
GRANT ALL ON public.ads_ab_variants TO service_role;
ALTER TABLE public.ads_ab_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ab variants" ON public.ads_ab_variants FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts
CREATE TABLE IF NOT EXISTS public.ads_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  metric jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_alerts TO authenticated;
GRANT ALL ON public.ads_alerts TO service_role;
ALTER TABLE public.ads_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.ads_alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ads_alerts_user_created_idx ON public.ads_alerts (user_id, created_at DESC);

-- Optimizations upgrade
ALTER TABLE public.ads_optimizations
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS title text;

-- Prevent duplicate open recommendations
CREATE UNIQUE INDEX IF NOT EXISTS ads_optimizations_open_unique
  ON public.ads_optimizations (user_id, campaign_id, type)
  WHERE status = 'pending';

-- Schedule optimization job every 6h
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ads-optimization-run') THEN
    PERFORM cron.unschedule('ads-optimization-run');
  END IF;
  PERFORM cron.schedule(
    'ads-optimization-run',
    '30 */6 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/run-ads-optimization',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;