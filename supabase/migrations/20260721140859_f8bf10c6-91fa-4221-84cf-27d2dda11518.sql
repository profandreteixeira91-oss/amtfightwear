
CREATE TABLE public.dojo_invoice_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.dojo_invoices(id) ON DELETE CASCADE,
  offset_days INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX dojo_invoice_reminders_idempotency
  ON public.dojo_invoice_reminders (invoice_id, offset_days, channel);
CREATE INDEX dojo_invoice_reminders_owner_idx
  ON public.dojo_invoice_reminders (owner_id, sent_at DESC);

GRANT SELECT ON public.dojo_invoice_reminders TO authenticated;
GRANT ALL ON public.dojo_invoice_reminders TO service_role;

ALTER TABLE public.dojo_invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their reminders"
  ON public.dojo_invoice_reminders FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
