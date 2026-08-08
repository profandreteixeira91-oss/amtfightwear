-- Create the new product with correct column names
INSERT INTO public.products (
  name, 
  slug, 
  price, 
  category_id, 
  short_description, 
  description, 
  image_url, 
  status, 
  ncm, 
  cfop_internal, 
  origem, 
  unidade,
  wholesale_enabled,
  wholesale_discount_percent
)
VALUES (
  'Rashguard Full Color Manga Longa Básica AMT Fight Wear',
  'rashguard-full-color-manga-longa-basica-amt',
  99.90,
  'e2306e59-9847-4b08-89b6-6c42eee36b58', -- Rashguard Básica Adulto
  'A Rashguard Full Color AMT é ideal para treinos de alta performance, oferecendo compressão e estilo.',
  'Desenvolvida com material de alta qualidade, a Rashguard Full Color proporciona liberdade de movimento e durabilidade extrema. Design moderno com cores vibrantes.',
  'https://id-preview--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/src/assets/rashguard-full-color-black.png.asset.json',
  'active',
  '6109.90.00',
  '5101',
  '0',
  'UN',
  true,
  25
)
RETURNING id;
