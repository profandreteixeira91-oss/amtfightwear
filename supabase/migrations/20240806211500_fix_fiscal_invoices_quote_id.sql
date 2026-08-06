-- Add quote_id column to fiscal_invoices table to support emission from quotes
ALTER TABLE public.fiscal_invoices ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.store_quotes(id);

-- Explicitly grant permissions again just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO authenticated;
GRANT ALL ON public.fiscal_invoices TO service_role;
