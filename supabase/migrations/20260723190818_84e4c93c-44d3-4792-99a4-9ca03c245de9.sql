
ALTER TABLE public.dojo_expenses
  ADD COLUMN IF NOT EXISTS team_payment_id uuid REFERENCES public.dojo_team_payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dojo_expenses_team_payment
  ON public.dojo_expenses(team_payment_id)
  WHERE team_payment_id IS NOT NULL;
