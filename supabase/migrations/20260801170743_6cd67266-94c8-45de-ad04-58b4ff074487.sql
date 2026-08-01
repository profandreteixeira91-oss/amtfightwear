ALTER TABLE public.store_production_jobs
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS total_value numeric;

CREATE TABLE IF NOT EXISTS public.store_finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid UNIQUE REFERENCES public.store_production_jobs(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'production',
  source_id uuid,
  reference text,
  description text NOT NULL,
  customer_name text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric,
  amount numeric NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_finance_entries TO authenticated;
GRANT ALL ON public.store_finance_entries TO service_role;

ALTER TABLE public.store_finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team can manage store finance entries" ON public.store_finance_entries;
CREATE POLICY "Team can manage store finance entries"
  ON public.store_finance_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS store_finance_entries_occurred_idx ON public.store_finance_entries (occurred_at DESC);

DROP TRIGGER IF EXISTS update_store_finance_entries_updated_at ON public.store_finance_entries;
CREATE TRIGGER update_store_finance_entries_updated_at
  BEFORE UPDATE ON public.store_finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill de valores a partir dos pedidos
UPDATE public.store_production_jobs j
SET unit_price = i.unit_price,
    total_value = COALESCE(i.total_price, i.unit_price * j.quantity)
FROM public.store_order_items i
WHERE j.source = 'order' AND j.source_item_key = i.id::text AND j.total_value IS NULL;

-- Backfill de valores a partir dos orçamentos aprovados
UPDATE public.store_production_jobs j
SET unit_price = (it.item->>'unit_price')::numeric,
    total_value = (it.item->>'unit_price')::numeric * j.quantity
FROM (
  SELECT q.id AS quote_id, (ord.idx - 1)::text AS key, ord.item
  FROM public.store_quotes q
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.items, '[]'::jsonb)) WITH ORDINALITY AS ord(item, idx)
) it
WHERE j.source = 'quote' AND j.source_id = it.quote_id AND j.source_item_key = it.key
  AND j.total_value IS NULL AND (it.item->>'unit_price') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.store_production_finance_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_done boolean;
  v_was_done boolean;
BEGIN
  v_done := (NEW.stage = 'finalizado' OR NEW.status = 'done');
  v_was_done := (COALESCE(OLD.stage, '') = 'finalizado' OR COALESCE(OLD.status, '') = 'done');

  IF v_done THEN
    v_amount := COALESCE(NEW.total_value, COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 0));
    INSERT INTO public.store_finance_entries (
      job_id, source, source_id, reference, description, customer_name, quantity, unit_price, amount, occurred_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.source, 'manual'),
      NEW.source_id,
      NEW.reference,
      NEW.product_name || COALESCE(' — ' || NEW.variant_label, ''),
      NEW.customer_name,
      COALESCE(NEW.quantity, 1),
      NEW.unit_price,
      COALESCE(v_amount, 0),
      COALESCE(NEW.completed_at, now())
    )
    ON CONFLICT (job_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      quantity = EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      description = EXCLUDED.description,
      customer_name = EXCLUDED.customer_name,
      reference = EXCLUDED.reference;
  ELSIF v_was_done THEN
    DELETE FROM public.store_finance_entries WHERE job_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_production_finance_sync_upd ON public.store_production_jobs;
CREATE TRIGGER store_production_finance_sync_upd
  AFTER UPDATE ON public.store_production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.store_production_finance_sync();

DROP TRIGGER IF EXISTS store_production_finance_sync_ins ON public.store_production_jobs;
CREATE TRIGGER store_production_finance_sync_ins
  AFTER INSERT ON public.store_production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.store_production_finance_sync();