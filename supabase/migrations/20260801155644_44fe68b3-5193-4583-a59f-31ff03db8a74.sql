CREATE TABLE public.store_production_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('order','quote','manual')),
  source_id UUID,
  source_item_key TEXT,
  reference TEXT,
  customer_name TEXT,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  sku TEXT,
  image_url TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in_production','paused','done','cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  assignee TEXT,
  notes TEXT,
  custom_config JSONB,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX store_production_jobs_source_unique
  ON public.store_production_jobs (source, source_id, source_item_key)
  WHERE source_id IS NOT NULL AND source_item_key IS NOT NULL;

CREATE INDEX store_production_jobs_queue_idx ON public.store_production_jobs (status, priority DESC, queued_at ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_production_jobs TO authenticated;
GRANT ALL ON public.store_production_jobs TO service_role;

ALTER TABLE public.store_production_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can manage production queue"
  ON public.store_production_jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_store_production_jobs_updated_at
  BEFORE UPDATE ON public.store_production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();