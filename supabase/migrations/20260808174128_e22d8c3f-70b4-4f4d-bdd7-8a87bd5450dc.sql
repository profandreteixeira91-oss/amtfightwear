UPDATE public.products 
SET category_id = '39dd51c8-00d0-471f-8301-95a9e325679e' 
WHERE (name ILIKE '%Faixa%Judô%Premium%' OR name ILIKE '%Faixa%Judo%Premium%') 
AND name NOT ILIKE '%Bordado%';