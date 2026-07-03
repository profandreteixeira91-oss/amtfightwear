
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: creative embeddings (winning creatives learning base)
CREATE TABLE public.ads_creative_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES public.ads_creatives(id) ON DELETE SET NULL,
  copy_id UUID REFERENCES public.ads_copies(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  performance_score NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC,
  ctr NUMERIC,
  cpa NUMERIC,
  spend NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_creative_embeddings TO authenticated;
GRANT ALL ON public.ads_creative_embeddings TO service_role;

ALTER TABLE public.ads_creative_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own embeddings" ON public.ads_creative_embeddings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ads_creative_embeddings_user_idx ON public.ads_creative_embeddings(user_id);
CREATE INDEX ads_creative_embeddings_vec_idx ON public.ads_creative_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER ads_creative_embeddings_updated_at
  BEFORE UPDATE ON public.ads_creative_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Table: scale history (audit + guardrails for auto-scaling)
CREATE TABLE public.ads_scale_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- scale_up | scale_down | pause | duplicate
  previous_budget NUMERIC,
  new_budget NUMERIC,
  scale_pct NUMERIC,
  reason TEXT,
  roas_at_action NUMERIC,
  ctr_at_action NUMERIC,
  cpa_at_action NUMERIC,
  auto_applied BOOLEAN NOT NULL DEFAULT true,
  meta_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_scale_history TO authenticated;
GRANT ALL ON public.ads_scale_history TO service_role;

ALTER TABLE public.ads_scale_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scale history" ON public.ads_scale_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ads_scale_history_campaign_idx ON public.ads_scale_history(campaign_id, created_at DESC);

-- Winner scoring column on creatives
ALTER TABLE public.ads_creatives
  ADD COLUMN IF NOT EXISTS winner_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

ALTER TABLE public.ads_copies
  ADD COLUMN IF NOT EXISTS winner_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

-- Cron: run scaling algorithm every 4 hours
SELECT cron.schedule(
  'ads-scale-winners',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/scale-winners',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocnVtbm54cnd4bmFuZHZxbm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU3OTIsImV4cCI6MjA5ODQ5MTc5Mn0.eUFYOzAHxSpU7AnrRm5mvKRGapaXzaHz8CT5-JL8QB8"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
