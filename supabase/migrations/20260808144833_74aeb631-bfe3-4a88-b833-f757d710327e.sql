-- Update main product image to the black variant
UPDATE public.products 
SET image_url = '/__l5e/assets-v1/86c41581-a95a-4796-b3e1-4d2ff1554d63/rashguard-full-color-black-v2.png'
WHERE id = '16b22f1f-12fd-453e-b8d3-ad7a3681feb7';

-- Update gallery images
-- Delete old images first to avoid confusion
DELETE FROM public.store_product_images WHERE product_id = '16b22f1f-12fd-453e-b8d3-ad7a3681feb7';

-- Insert new images
INSERT INTO public.store_product_images (product_id, url, alt, sort_order)
VALUES
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', '/__l5e/assets-v1/86c41581-a95a-4796-b3e1-4d2ff1554d63/rashguard-full-color-black-v2.png', 'Rashguard Full Color Preta', 0),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', '/__l5e/assets-v1/71d526ad-5094-4018-b809-1fe10ed35d3d/rashguard-full-color-blue-v2.png', 'Rashguard Full Color Azul', 1),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', '/__l5e/assets-v1/8d4c68d6-0de6-4614-a70a-70a2ddb2bfdf/rashguard-full-color-purple-v2.png', 'Rashguard Full Color Roxa', 2),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', '/__l5e/assets-v1/9f950c17-2b1b-4f87-b31c-c3d23f82e688/rashguard-full-color-brown-v2.png', 'Rashguard Full Color Marrom', 3),
  ('16b22f1f-12fd-453e-b8d3-ad7a3681feb7', '/__l5e/assets-v1/2e92fdc4-76e5-44a3-af1c-9ed96a59e421/rashguard-full-color-white-v2.png', 'Rashguard Full Color Branca', 4);
