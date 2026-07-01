ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
CREATE UNIQUE INDEX IF NOT EXISTS products_source_url_key ON public.products(source_url) WHERE source_url IS NOT NULL;
DELETE FROM public.order_items WHERE product_id IN (SELECT id FROM public.products WHERE source_url IS NULL);
DELETE FROM public.products WHERE source_url IS NULL;