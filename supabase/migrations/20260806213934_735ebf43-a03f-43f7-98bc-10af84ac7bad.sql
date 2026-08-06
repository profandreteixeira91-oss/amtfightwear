
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fiscal_invoices' AND column_name='quote_id') THEN
        ALTER TABLE public.fiscal_invoices ADD COLUMN quote_id UUID REFERENCES public.store_quotes(id) ON DELETE SET NULL;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO anon;
GRANT ALL ON public.fiscal_invoices TO service_role;

COMMENT ON TABLE public.fiscal_invoices IS 'Modulo Fiscal - Notas Fiscais (Updated for quote_id support)';
