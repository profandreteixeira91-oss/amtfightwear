-- Recriar as tabelas fiscais que sumiram ou não foram criadas corretamente
-- Enum para status de nota fiscal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'pending', 'authorized', 'rejected', 'cancelled', 'denied', 'error');
    END IF;
END
$$;

-- Tabela para armazenar certificados digitais
CREATE TABLE IF NOT EXISTS public.fiscal_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    issuer_name TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    cnpj TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Configuração Fiscal do Emitente
CREATE TABLE IF NOT EXISTS public.fiscal_issuer_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT NOT NULL UNIQUE,
    inscricao_estadual TEXT NOT NULL,
    inscricao_municipal TEXT,
    regime_tributario INTEGER NOT NULL, -- 1-Simples Nacional, 2-Simples Nacional (excesso), 3-Regime Normal
    address_street TEXT NOT NULL,
    address_number TEXT NOT NULL,
    address_complement TEXT,
    address_neighborhood TEXT NOT NULL,
    address_city_code TEXT NOT NULL, -- Código IBGE
    address_city_name TEXT NOT NULL,
    address_state TEXT NOT NULL,
    address_zip TEXT NOT NULL,
    environment TEXT DEFAULT 'homologacao' CHECK (environment IN ('homologacao', 'producao')),
    last_nfe_number INTEGER DEFAULT 0,
    last_nfe_series INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Notas Fiscais
CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id UUID, -- Referência ao pedido na loja
    invoice_number INTEGER NOT NULL,
    series INTEGER NOT NULL,
    status public.invoice_status DEFAULT 'draft',
    xml_content TEXT,
    protocol TEXT,
    access_key TEXT,
    total_amount DECIMAL(12,2) NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_document TEXT NOT NULL,
    issue_date TIMESTAMPTZ DEFAULT now(),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_issuer_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO authenticated;

GRANT ALL ON public.fiscal_certificates TO service_role;
GRANT ALL ON public.fiscal_issuer_config TO service_role;
GRANT ALL ON public.fiscal_invoices TO service_role;

-- Habilitar RLS
ALTER TABLE public.fiscal_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_issuer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_certificates' AND policyname = 'Users can manage their own certificates') THEN
        CREATE POLICY "Users can manage their own certificates" ON public.fiscal_certificates
            FOR ALL TO authenticated USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_issuer_config' AND policyname = 'Users can manage their own issuer config') THEN
        CREATE POLICY "Users can manage their own issuer config" ON public.fiscal_issuer_config
            FOR ALL TO authenticated USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_invoices' AND policyname = 'Users can manage their own invoices') THEN
        CREATE POLICY "Users can manage their own invoices" ON public.fiscal_invoices
            FOR ALL TO authenticated USING (auth.uid() = owner_id);
    END IF;
END
$$;
