
-- Add stripe color for two-tone belts
ALTER TABLE public.dojo_belts ADD COLUMN IF NOT EXISTS stripe_hex text;

-- Unique constraint so we can upsert defaults
CREATE UNIQUE INDEX IF NOT EXISTS dojo_belts_owner_name_uniq ON public.dojo_belts(owner_id, name);

-- Seed / update the standard 17-belt system for every existing dojo owner
DO $$
DECLARE
  o uuid;
  belts jsonb := '[
    {"n":"Branca","c":"#F5F5F5","s":null,"o":1,"d":4},
    {"n":"Cinza com Branco","c":"#9E9E9E","s":"#FFFFFF","o":2,"d":4},
    {"n":"Cinza","c":"#9E9E9E","s":null,"o":3,"d":4},
    {"n":"Cinza com Preto","c":"#9E9E9E","s":"#000000","o":4,"d":4},
    {"n":"Amarela com Branco","c":"#FDD835","s":"#FFFFFF","o":5,"d":4},
    {"n":"Amarela","c":"#FDD835","s":null,"o":6,"d":4},
    {"n":"Amarela com Preto","c":"#FDD835","s":"#000000","o":7,"d":4},
    {"n":"Laranja com Branco","c":"#FB8C00","s":"#FFFFFF","o":8,"d":4},
    {"n":"Laranja","c":"#FB8C00","s":null,"o":9,"d":4},
    {"n":"Laranja com Preto","c":"#FB8C00","s":"#000000","o":10,"d":4},
    {"n":"Verde com Branco","c":"#43A047","s":"#FFFFFF","o":11,"d":4},
    {"n":"Verde","c":"#43A047","s":null,"o":12,"d":4},
    {"n":"Verde com Preto","c":"#43A047","s":"#000000","o":13,"d":4},
    {"n":"Azul","c":"#1E63C4","s":null,"o":14,"d":4},
    {"n":"Roxa","c":"#6A1B9A","s":null,"o":15,"d":4},
    {"n":"Marrom","c":"#5D4037","s":null,"o":16,"d":4},
    {"n":"Preta","c":"#111111","s":null,"o":17,"d":6}
  ]'::jsonb;
  b jsonb;
BEGIN
  FOR o IN SELECT DISTINCT owner_id FROM public.dojo_belts LOOP
    FOR b IN SELECT * FROM jsonb_array_elements(belts) LOOP
      INSERT INTO public.dojo_belts (owner_id, name, color_hex, stripe_hex, sort_order, max_degrees)
      VALUES (o, b->>'n', b->>'c', b->>'s', (b->>'o')::int, (b->>'d')::int)
      ON CONFLICT (owner_id, name) DO UPDATE
        SET color_hex = EXCLUDED.color_hex,
            stripe_hex = EXCLUDED.stripe_hex,
            sort_order = EXCLUDED.sort_order,
            max_degrees = EXCLUDED.max_degrees;
    END LOOP;
  END LOOP;
END $$;
