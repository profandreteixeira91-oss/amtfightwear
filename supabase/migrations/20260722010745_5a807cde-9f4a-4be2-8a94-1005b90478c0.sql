INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, max_degrees, sort_order, category, modality, owner_id)
SELECT 'Preta', '#111111', NULL, 7, 17, 'adulto', 'jiu-jitsu', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.dojo_belts
   WHERE modality = 'jiu-jitsu' AND lower(name) = 'preta' AND owner_id IS NULL
);

UPDATE public.dojo_belts
   SET max_degrees = 7
 WHERE modality = 'jiu-jitsu' AND lower(name) = 'preta';

UPDATE public.dojo_graduations g
   SET belt_id = (
         SELECT p.id FROM public.dojo_belts p
          WHERE p.modality = 'jiu-jitsu' AND lower(p.name) = 'preta'
            AND (p.owner_id = g.owner_id OR p.owner_id IS NULL)
          ORDER BY (p.owner_id = g.owner_id) DESC NULLS LAST
          LIMIT 1
       ),
       degree = v.enc_degree
  FROM (
    SELECT id AS variant_id,
           CASE
             WHEN lower(name) ~ '^preta\s+com\s+aparador' THEN 1
             WHEN lower(name) ~ '^preta\s*1\s*grau'       THEN 2
             WHEN lower(name) ~ '^preta\s*2\s*grau'       THEN 3
             WHEN lower(name) ~ '^preta\s*3\s*grau'       THEN 4
             WHEN lower(name) ~ '^preta\s*4\s*grau'       THEN 5
             WHEN lower(name) ~ '^preta\s*5\s*grau'       THEN 6
             WHEN lower(name) ~ '^preta\s*6\s*grau'       THEN 7
           END AS enc_degree
      FROM public.dojo_belts
     WHERE modality = 'jiu-jitsu'
       AND (lower(name) ~ '^preta\s+com\s+aparador' OR lower(name) ~ '^preta\s*[1-6]\s*grau')
  ) v
 WHERE g.belt_id = v.variant_id AND v.enc_degree IS NOT NULL;

UPDATE public.dojo_students s
   SET current_belt_id = (
         SELECT p.id FROM public.dojo_belts p
          WHERE p.modality = 'jiu-jitsu' AND lower(p.name) = 'preta'
            AND (p.owner_id = s.owner_id OR p.owner_id IS NULL)
          ORDER BY (p.owner_id = s.owner_id) DESC NULLS LAST
          LIMIT 1
       ),
       current_degree = v.enc_degree
  FROM (
    SELECT id AS variant_id,
           CASE
             WHEN lower(name) ~ '^preta\s+com\s+aparador' THEN 1
             WHEN lower(name) ~ '^preta\s*1\s*grau'       THEN 2
             WHEN lower(name) ~ '^preta\s*2\s*grau'       THEN 3
             WHEN lower(name) ~ '^preta\s*3\s*grau'       THEN 4
             WHEN lower(name) ~ '^preta\s*4\s*grau'       THEN 5
             WHEN lower(name) ~ '^preta\s*5\s*grau'       THEN 6
             WHEN lower(name) ~ '^preta\s*6\s*grau'       THEN 7
           END AS enc_degree
      FROM public.dojo_belts
     WHERE modality = 'jiu-jitsu'
       AND (lower(name) ~ '^preta\s+com\s+aparador' OR lower(name) ~ '^preta\s*[1-6]\s*grau')
  ) v
 WHERE s.current_belt_id = v.variant_id AND v.enc_degree IS NOT NULL;

DELETE FROM public.dojo_belts
 WHERE modality = 'jiu-jitsu'
   AND (lower(name) ~ '^preta\s+com\s+aparador' OR lower(name) ~ '^preta\s*[1-6]\s*grau');