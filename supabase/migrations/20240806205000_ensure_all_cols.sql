DO $$ 
BEGIN 
    -- Garantir colunas na store_products
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS cfop_internal TEXT;
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS cfop_interstate TEXT;
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS ncm TEXT;
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS cest TEXT;
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS unit_commercial TEXT DEFAULT 'UN';
    ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS unit_taxable TEXT DEFAULT 'UN';
END $$;
