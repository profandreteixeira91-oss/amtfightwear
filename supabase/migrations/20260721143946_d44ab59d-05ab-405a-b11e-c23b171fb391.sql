ALTER TABLE public.dojo_payment_settings
  ADD COLUMN IF NOT EXISTS invoice_business_name text,
  ADD COLUMN IF NOT EXISTS invoice_document text,
  ADD COLUMN IF NOT EXISTS invoice_logo_url text,
  ADD COLUMN IF NOT EXISTS invoice_phone text,
  ADD COLUMN IF NOT EXISTS invoice_email text,
  ADD COLUMN IF NOT EXISTS invoice_address text,
  ADD COLUMN IF NOT EXISTS invoice_footer_note text;