
ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

ALTER TABLE public.dojo_enrollments
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_type text,
  ADD COLUMN IF NOT EXISTS payment_method_code text;

CREATE INDEX IF NOT EXISTS idx_dojo_invoices_asaas_charge
  ON public.dojo_invoices (asaas_charge_id);

CREATE INDEX IF NOT EXISTS idx_dojo_invoices_asaas_subscription
  ON public.dojo_invoices (asaas_subscription_id);

CREATE INDEX IF NOT EXISTS idx_dojo_enrollments_asaas_subscription
  ON public.dojo_enrollments (asaas_subscription_id);

CREATE INDEX IF NOT EXISTS idx_dojo_students_asaas_customer
  ON public.dojo_students (asaas_customer_id);
