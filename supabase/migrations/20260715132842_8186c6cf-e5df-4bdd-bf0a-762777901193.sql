
INSERT INTO public.store_categories (slug, name, description, sort_order, active) VALUES
  ('kimonos', 'Kimonos', 'Kimonos de Jiu-Jitsu para treino e competição', 1, true),
  ('rashguards', 'Rashguards', 'Rashguards manga longa e curta', 2, true),
  ('faixas', 'Faixas', 'Faixas oficiais de BJJ', 3, true),
  ('shorts', 'Shorts', 'Shorts de luta e treino', 4, true),
  ('spats', 'Spats & Leggings', 'Spats e leggings para grappling', 5, true),
  ('camisetas', 'Camisetas', 'Camisetas AMT', 6, true),
  ('moletons', 'Moletons', 'Moletons e casacos AMT', 7, true),
  ('acessorios', 'Acessórios', 'Bucais, joelheiras, faixas de cabeça e mais', 8, true),
  ('mochilas', 'Mochilas & Bolsas', 'Mochilas e bolsas para atletas', 9, true),
  ('feminino', 'Feminino', 'Linha feminina AMT', 10, true),
  ('infantil', 'Infantil', 'Linha infantil AMT', 11, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  active = true;
