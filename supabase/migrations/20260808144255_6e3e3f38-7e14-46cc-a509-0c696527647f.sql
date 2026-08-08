-- Product ID: 16b22f1f-12fd-453e-b8d3-ad7a3681feb7

-- Insert Variants (5 colors x 6 sizes)
WITH colors(name, hex) AS (
  VALUES 
    ('Preta', '#000000'),
    ('Azul', '#0000FF'),
    ('Roxa', '#800080'),
    ('Marrom', '#5D4037'),
    ('Branca', '#FFFFFF')
),
sizes(name, sort_order) AS (
  VALUES 
    ('P', 0),
    ('M', 1),
    ('G', 2),
    ('GG', 3),
    ('XG', 4),
    ('XXG', 5)
)
INSERT INTO public.store_product_variants (
  product_id, 
  size, 
  color, 
  price, 
  stock, 
  active, 
  sort_order
)
SELECT 
  '16b22f1f-12fd-453e-b8d3-ad7a3681feb7',
  sizes.name,
  colors.name,
  99.90,
  10,
  true,
  (colors_rank.rn * 10) + sizes.sort_order
FROM colors, sizes, (SELECT name, row_number() OVER () as rn FROM colors) colors_rank
WHERE colors.name = colors_rank.name;

-- Insert Images
INSERT INTO public.store_product_images (product_id, url, alt, sort_order)
VALUES
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', 'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-black.png.asset.json', 'Rashguard Full Color Preta', 0),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', 'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-blue.png.asset.json', 'Rashguard Full Color Azul', 1),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', 'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-purple.png.asset.json', 'Rashguard Full Color Roxa', 2),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', 'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-brown.png.asset.json', 'Rashguard Full Color Marrom', 3),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', 'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-white.png.asset.json', 'Rashguard Full Color Branca', 4);
