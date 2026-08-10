ALTER TABLE public.app_pricing_configs 
ADD COLUMN IF NOT EXISTS monthly_production_estimate numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS desired_pro_labore numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserve_percent numeric DEFAULT 4,
ADD COLUMN IF NOT EXISTS profit_percent numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_percent numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS taxes_percent numeric DEFAULT 6,
ADD COLUMN IF NOT EXISTS gateway_percent numeric DEFAULT 5;

-- Adicionar campos de precificação individual no produto se não existirem
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS pricing_marketing_percent numeric,
ADD COLUMN IF NOT EXISTS pricing_taxes_percent numeric,
ADD COLUMN IF NOT EXISTS pricing_gateway_percent numeric,
ADD COLUMN IF NOT EXISTS pricing_commission_percent numeric,
ADD COLUMN IF NOT EXISTS pricing_reserve_percent numeric,
ADD COLUMN IF NOT EXISTS pricing_profit_percent numeric;

GRANT ALL ON public.app_pricing_configs TO authenticated;
GRANT ALL ON public.app_pricing_configs TO service_role;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
