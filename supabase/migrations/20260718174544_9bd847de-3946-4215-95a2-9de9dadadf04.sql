
UPDATE public.dojo_belts SET stripe_hex = NULL, max_degrees = 0 WHERE name = 'Preta';

INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, max_degrees, sort_order, category, owner_id)
SELECT 'Preta com aparador', '#111111', '#D32F2F', 0, 17, 'adulto', owner_id
FROM public.dojo_belts WHERE name = 'Preta';

INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, max_degrees, sort_order, category, owner_id)
SELECT 'Preta 1 a 6 graus', '#111111', '#D32F2F', 6, 18, 'adulto', owner_id
FROM public.dojo_belts WHERE name = 'Preta';
