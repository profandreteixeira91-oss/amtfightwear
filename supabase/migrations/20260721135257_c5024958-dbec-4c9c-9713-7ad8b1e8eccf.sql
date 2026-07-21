
ALTER TABLE public.dojo_enrollments
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS custom_days INTEGER,
  ADD COLUMN IF NOT EXISTS next_run_at DATE,
  ADD COLUMN IF NOT EXISTS last_run_at DATE,
  ADD COLUMN IF NOT EXISTS paused_from DATE,
  ADD COLUMN IF NOT EXISTS paused_until DATE,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER,
  ADD COLUMN IF NOT EXISTS installments_generated INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill next_run_at para matrículas ativas usando due_day do mês corrente/próximo
UPDATE public.dojo_enrollments
SET next_run_at = (
  CASE
    WHEN date_part('day', CURRENT_DATE)::int <= LEAST(due_day, date_part('day', (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'))::int)
      THEN (date_trunc('month', CURRENT_DATE) + (LEAST(due_day, date_part('day', (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'))::int) - 1) * interval '1 day')::date
    ELSE (date_trunc('month', CURRENT_DATE + interval '1 month') + (LEAST(due_day, date_part('day', (date_trunc('month', CURRENT_DATE + interval '1 month') + interval '1 month - 1 day'))::int) - 1) * interval '1 day')::date
  END
)
WHERE next_run_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_dojo_enrollments_next_run ON public.dojo_enrollments (next_run_at) WHERE status = 'active';
