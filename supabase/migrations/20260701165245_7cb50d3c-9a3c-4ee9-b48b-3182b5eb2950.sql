DROP INDEX IF EXISTS public.products_source_url_key;
CREATE UNIQUE INDEX products_source_url_key ON public.products(source_url);