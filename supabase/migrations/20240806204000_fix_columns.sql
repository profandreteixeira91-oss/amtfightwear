DO $$ 
BEGIN 
    -- Tabela store_products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='cfop_internal') THEN
        ALTER TABLE public.store_products ADD COLUMN cfop_internal TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='cfop_interstate') THEN
        ALTER TABLE public.store_products ADD COLUMN cfop_interstate TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='unit_commercial') THEN
        ALTER TABLE public.store_products ADD COLUMN unit_commercial TEXT DEFAULT 'UN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='unit_taxable') THEN
        ALTER TABLE public.store_products ADD COLUMN unit_taxable TEXT DEFAULT 'UN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='ncm') THEN
        ALTER TABLE public.store_products ADD COLUMN ncm TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_products' AND column_name='cest') THEN
        ALTER TABLE public.store_products ADD COLUMN cest TEXT;
    END IF;

    -- Tabela products (se existir separada ou for alias)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='products') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cfop_internal') THEN
            ALTER TABLE public.products ADD COLUMN cfop_internal TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cfop_interstate') THEN
            ALTER TABLE public.products ADD COLUMN cfop_interstate TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit_commercial') THEN
            ALTER TABLE public.products ADD COLUMN unit_commercial TEXT DEFAULT 'UN';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit_taxable') THEN
            ALTER TABLE public.products ADD COLUMN unit_taxable TEXT DEFAULT 'UN';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='ncm') THEN
            ALTER TABLE public.products ADD COLUMN ncm TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cest') THEN
            ALTER TABLE public.products ADD COLUMN cest TEXT;
        END IF;
    END IF;
END $$;
