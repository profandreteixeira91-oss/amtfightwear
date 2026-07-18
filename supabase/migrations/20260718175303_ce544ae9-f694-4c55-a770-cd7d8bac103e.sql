
-- Remove existing preta variants (no graduations reference them yet)
DELETE FROM public.dojo_belts WHERE name ILIKE 'preta%';

-- Reinsert in exact order matching the reference image
WITH ow AS (SELECT owner_id FROM public.dojo_belts LIMIT 1)
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, max_degrees, sort_order, category, owner_id)
SELECT v.name, '#111111', '#D32F2F', 0, v.sort_order, 'adulto', ow.owner_id FROM ow, (VALUES
  ('Preta', 17),
  ('Preta com aparador', 18),
  ('Preta 1 grau', 19),
  ('Preta 2 grau', 20),
  ('Preta 3 grau', 21),
  ('Preta 4 grau', 22),
  ('Preta 5 grau', 23),
  ('Preta 6 grau', 24)
) AS v(name, sort_order);

-- Shift higher belts to keep ordering intact
UPDATE public.dojo_belts SET sort_order = 25 WHERE name = 'Vermelha e Preta';
UPDATE public.dojo_belts SET sort_order = 26 WHERE name = 'Vermelha e Branca';
UPDATE public.dojo_belts SET sort_order = 27 WHERE name = 'Vermelha';
