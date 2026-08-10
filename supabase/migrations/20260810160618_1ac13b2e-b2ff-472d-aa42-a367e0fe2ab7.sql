-- Create app_pricing_configs for global settings
CREATE TABLE IF NOT EXISTS public.app_pricing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    min_net_margin DECIMAL DEFAULT 15,
    min_contribution_margin DECIMAL DEFAULT 35,
    default_tax_rate DECIMAL DEFAULT 8,
    default_gateway_fee DECIMAL DEFAULT 4,
    default_marketing_percent DECIMAL DEFAULT 10,
    wholesale_min_qty INTEGER DEFAULT 10,
    wholesale_discount_percent DECIMAL DEFAULT 25,
    apportionment_method TEXT DEFAULT 'revenue', -- revenue, quantity, cost, manual
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_pricing_configs TO authenticated;
GRANT ALL ON public.app_pricing_configs TO service_role;
ALTER TABLE public.app_pricing_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own pricing configs" ON public.app_pricing_configs
        FOR ALL TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create product_cost_compositions for Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS public.product_cost_compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- material, labor, packaging, other
    unit_of_measure TEXT,
    quantity DECIMAL DEFAULT 1,
    unit_cost DECIMAL DEFAULT 0,
    waste_percent DECIMAL DEFAULT 0,
    provider TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_compositions TO authenticated;
GRANT ALL ON public.product_cost_compositions TO service_role;
ALTER TABLE public.product_cost_compositions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own cost compositions" ON public.product_cost_compositions
        FOR ALL TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create cost_change_history for audit
CREATE TABLE IF NOT EXISTS public.cost_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    composition_id UUID REFERENCES public.product_cost_compositions(id) ON DELETE SET NULL,
    old_cost DECIMAL,
    new_cost DECIMAL,
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.cost_change_history TO authenticated;
GRANT ALL ON public.cost_change_history TO service_role;
ALTER TABLE public.cost_change_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can view their own cost history" ON public.cost_change_history
        FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value DECIMAL NOT NULL DEFAULT 0,
    category TEXT, -- rent, salary, systems, etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_expenses TO authenticated;
GRANT ALL ON public.fixed_expenses TO service_role;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own fixed expenses" ON public.fixed_expenses
        FOR ALL TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create marketing_investments table
CREATE TABLE IF NOT EXISTS public.marketing_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- Meta Ads, Google Ads, Influencers, etc.
    monthly_investment DECIMAL NOT NULL DEFAULT 0,
    new_customers_goal INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_investments TO authenticated;
GRANT ALL ON public.marketing_investments TO service_role;
ALTER TABLE public.marketing_investments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own marketing investments" ON public.marketing_investments
        FOR ALL TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create pricing_scenarios for simulations
CREATE TABLE IF NOT EXISTS public.pricing_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_scenarios TO authenticated;
GRANT ALL ON public.pricing_scenarios TO service_role;
ALTER TABLE public.pricing_scenarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own pricing scenarios" ON public.pricing_scenarios
        FOR ALL TO authenticated USING (auth.uid() = tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
