-- Force schema cache refresh by adding a dummy comment to the table
COMMENT ON TABLE public.fiscal_invoices IS 'Módulo Fiscal - Central AMT';

-- Re-grant everything to be sure
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO anon;
GRANT ALL ON public.fiscal_invoices TO service_role;
