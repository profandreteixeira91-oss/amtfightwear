
-- Ads accounts (Meta ad accounts connected)
CREATE TABLE public.ads_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_connection_id UUID REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  act_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT,
  timezone TEXT,
  business_id TEXT,
  pixel_id TEXT,
  pixel_status TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  capabilities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, act_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_accounts TO authenticated;
GRANT ALL ON public.ads_accounts TO service_role;
ALTER TABLE public.ads_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_accounts" ON public.ads_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_accounts_updated BEFORE UPDATE ON public.ads_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ads briefings (strategic questionnaire answers)
CREATE TABLE public.ads_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id UUID,
  objective TEXT NOT NULL,
  price NUMERIC,
  margin NUMERIC,
  offer TEXT,
  deadline TEXT,
  region TEXT,
  age_range TEXT,
  gender TEXT,
  interests TEXT[],
  competitors TEXT,
  brand_tone TEXT,
  revenue_goal NUMERIC,
  budget_daily NUMERIC,
  budget_total NUMERIC,
  strategy JSONB,
  audiences JSONB,
  budget_estimate JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_briefings TO authenticated;
GRANT ALL ON public.ads_briefings TO service_role;
ALTER TABLE public.ads_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_briefings" ON public.ads_briefings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_briefings_updated BEFORE UPDATE ON public.ads_briefings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaigns
CREATE TABLE public.ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.ads_briefings(id) ON DELETE SET NULL,
  ads_account_id UUID REFERENCES public.ads_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  budget_daily NUMERIC,
  budget_total NUMERIC,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  meta_campaign_id TEXT,
  strategy JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_campaigns TO authenticated;
GRANT ALL ON public.ads_campaigns TO service_role;
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_campaigns" ON public.ads_campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_campaigns_updated BEFORE UPDATE ON public.ads_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Copies library
CREATE TABLE public.ads_copies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.ads_briefings(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE SET NULL,
  headline TEXT NOT NULL,
  primary_text TEXT NOT NULL,
  description TEXT,
  cta TEXT,
  hashtags TEXT[],
  triggers TEXT[],
  quality_score NUMERIC,
  click_potential TEXT,
  conversion_potential TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_copies TO authenticated;
GRANT ALL ON public.ads_copies TO service_role;
ALTER TABLE public.ads_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_copies" ON public.ads_copies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_copies_updated BEFORE UPDATE ON public.ads_copies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Creatives library
CREATE TABLE public.ads_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.ads_briefings(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE SET NULL,
  copy_id UUID REFERENCES public.ads_copies(id) ON DELETE SET NULL,
  format TEXT NOT NULL,
  aspect TEXT,
  image_url TEXT,
  storage_path TEXT,
  prompt TEXT,
  palette TEXT[],
  brief JSONB,
  score NUMERIC,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_creatives TO authenticated;
GRANT ALL ON public.ads_creatives TO service_role;
ALTER TABLE public.ads_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_creatives" ON public.ads_creatives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_creatives_updated BEFORE UPDATE ON public.ads_creatives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insights (daily metrics per campaign)
CREATE TABLE public.ads_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend NUMERIC DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr NUMERIC,
  cpm NUMERIC,
  cpc NUMERIC,
  cpa NUMERIC,
  conversions BIGINT DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  roas NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_insights TO authenticated;
GRANT ALL ON public.ads_insights TO service_role;
ALTER TABLE public.ads_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_insights" ON public.ads_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optimizations (AI suggestions)
CREATE TABLE public.ads_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT,
  suggestion JSONB,
  severity TEXT DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_optimizations TO authenticated;
GRANT ALL ON public.ads_optimizations TO service_role;
ALTER TABLE public.ads_optimizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ads_optimizations" ON public.ads_optimizations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ads_optimizations_updated BEFORE UPDATE ON public.ads_optimizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ads_campaigns_user_idx ON public.ads_campaigns(user_id, created_at DESC);
CREATE INDEX ads_insights_user_date_idx ON public.ads_insights(user_id, date DESC);
CREATE INDEX ads_creatives_user_idx ON public.ads_creatives(user_id, created_at DESC);
CREATE INDEX ads_copies_user_idx ON public.ads_copies(user_id, created_at DESC);
