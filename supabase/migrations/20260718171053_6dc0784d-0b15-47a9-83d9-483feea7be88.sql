DO $$
DECLARE
  o uuid;
  belts jsonb := '[
    {"n":"Preta com Aparador","c":"#111111","s":"#D32F2F","o":18,"d":6},
    {"n":"Vermelha e Preta","c":"#D32F2F","s":"#111111","o":19,"d":0},
    {"n":"Vermelha e Branca","c":"#D32F2F","s":"#FFFFFF","o":20,"d":0},
    {"n":"Vermelha","c":"#D32F2F","s":null,"o":21,"d":0}
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