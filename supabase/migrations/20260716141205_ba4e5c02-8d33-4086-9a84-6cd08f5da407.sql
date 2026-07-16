
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wholesale_discount_percent numeric(5,2);

CREATE INDEX IF NOT EXISTS idx_products_wholesale_enabled
  ON public.products (wholesale_enabled) WHERE wholesale_enabled = true;

INSERT INTO public.app_settings (key, value)
VALUES (
  'wholesale_settings',
  jsonb_build_object(
    'enabled', true,
    'default_discount_percent', 25,
    'min_qty_per_subcategory', 10,
    'conditions', 'Mínimo de 10 unidades por subcategoria. Etiqueta personalizada grátis. Prazo de produção de até 10 dias úteis. Frete calculado no checkout.'
  )
)
ON CONFLICT (key) DO NOTHING;
