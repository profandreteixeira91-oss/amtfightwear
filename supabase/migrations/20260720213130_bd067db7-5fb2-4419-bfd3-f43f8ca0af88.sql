-- 1) Add optional "carência" (minimum months in belt) column
ALTER TABLE public.dojo_belts
  ADD COLUMN IF NOT EXISTS min_months integer;

COMMENT ON COLUMN public.dojo_belts.min_months IS 'Carência opcional: tempo mínimo de permanência na faixa antes da próxima graduação, em meses. NULL = sem restrição.';

-- 2) Seed Karatê belts as GLOBAL catalog (owner_id NULL), following the traditional Kyu progression
INSERT INTO public.dojo_belts (name, color_hex, stripe_hex, sort_order, max_degrees, category, modality, owner_id, min_months) VALUES
  ('Branca',   '#FFFFFF', NULL, 10, 0, '7º Kyu', 'karate', NULL, 6),
  ('Amarela',  '#FDD835', NULL, 20, 0, '6º Kyu', 'karate', NULL, 6),
  ('Vermelha', '#B71C1C', NULL, 30, 0, '5º Kyu', 'karate', NULL, 6),
  ('Laranja',  '#FB923C', NULL, 40, 0, '4º Kyu', 'karate', NULL, 6),
  ('Verde',    '#16A34A', NULL, 50, 0, '3º Kyu', 'karate', NULL, 12),
  ('Roxa',     '#7C3AED', NULL, 60, 0, '2º Kyu', 'karate', NULL, 12),
  ('Marrom',   '#78350F', NULL, 70, 0, '1º Kyu', 'karate', NULL, 24),
  ('Preta',    '#111111', NULL, 80, 10, '1º Dan (min. 16 anos)', 'karate', NULL, 24)
ON CONFLICT DO NOTHING;