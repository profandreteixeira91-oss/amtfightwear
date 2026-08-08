UPDATE public.store_product_variants 
SET stock = 10 
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'rashguard-infantil-manga-longa-basica-amt');