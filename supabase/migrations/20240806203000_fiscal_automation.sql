-- Tabela de parametrização fiscal por categoria
CREATE TABLE public.fiscal_category_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.store_categories(id) ON DELETE CASCADE,
    ncm TEXT NOT NULL,
    cest TEXT,
    cfop_internal TEXT,
    cfop_interstate TEXT,
    cst_csosn TEXT,
    icms_rate NUMERIC(5,2) DEFAULT 0,
    unit_commercial TEXT DEFAULT 'UN',
    unit_taxable TEXT DEFAULT 'UN',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category_id)
);

-- Habilitar RLS e permissões
ALTER TABLE public.fiscal_category_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_category_settings TO authenticated;
GRANT ALL ON public.fiscal_category_settings TO service_role;

CREATE POLICY "Admins can manage fiscal category settings"
ON public.fiscal_category_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Logs de auditoria fiscal
CREATE TABLE public.fiscal_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    resource_type TEXT NOT NULL, -- 'product' ou 'category_settings'
    resource_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fiscal_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.fiscal_audit_logs TO authenticated;
GRANT ALL ON public.fiscal_audit_logs TO service_role;

CREATE POLICY "Admins can view audit logs"
ON public.fiscal_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar campos de CFOP no produto se não existirem
DO $$ 
BEGIN 
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
END $$;
