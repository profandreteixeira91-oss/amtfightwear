ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cfop_internal text,
  ADD COLUMN IF NOT EXISTS cfop_interstate text,
  ADD COLUMN IF NOT EXISTS unit_commercial text,
  ADD COLUMN IF NOT EXISTS unit_taxable text;

UPDATE public.products
SET cfop_internal = COALESCE(cfop_internal, cfop, '5102'),
    cfop_interstate = COALESCE(cfop_interstate, '6102'),
    unit_commercial = COALESCE(unit_commercial, unidade, 'UN'),
    unit_taxable = COALESCE(unit_taxable, unidade, 'UN');