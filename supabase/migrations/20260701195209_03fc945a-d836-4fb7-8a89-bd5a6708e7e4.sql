
CREATE TABLE public.price_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  competitor_name TEXT,
  competitor_url TEXT NOT NULL,
  competitor_price NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  title TEXT,
  description TEXT,
  similarity_score NUMERIC(4,3),
  source_type TEXT,
  raw_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_research_product ON public.price_research(product_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_research TO authenticated;
GRANT ALL ON public.price_research TO service_role;
ALTER TABLE public.price_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read price_research" ON public.price_research FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write price_research" ON public.price_research FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update price_research" ON public.price_research FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete price_research" ON public.price_research FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.price_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  current_price NUMERIC(12,2) NOT NULL,
  suggested_price NUMERIC(12,2) NOT NULL,
  min_market NUMERIC(12,2),
  avg_market NUMERIC(12,2),
  max_market NUMERIC(12,2),
  competitors_analyzed INTEGER NOT NULL DEFAULT 0,
  position TEXT,
  reasoning TEXT,
  description_gap TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_suggestions_product ON public.price_suggestions(product_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_suggestions TO authenticated;
GRANT ALL ON public.price_suggestions TO service_role;
ALTER TABLE public.price_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read price_suggestions" ON public.price_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write price_suggestions" ON public.price_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update price_suggestions" ON public.price_suggestions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete price_suggestions" ON public.price_suggestions FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
