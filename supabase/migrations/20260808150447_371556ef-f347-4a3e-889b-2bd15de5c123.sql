DO $$
DECLARE
    new_cat_id UUID;
    new_prod_id UUID;
    desc_text TEXT := '## CARACTERÍSTICAS TÉCNICAS

### RASHGUARDS — LINHA BÁSICA AMT FIGHT WEAR

* **Tecido:** Malha esportiva tecnológica
* **Composição:** 88% Poliéster / 12% Elastano
* **Gramatura:** Aproximadamente 200–220 g/m²
* **Elasticidade:** Multidirecional (4-way stretch)
* **Modelagem:** Anatômica e ajustada ao corpo
* **Secagem:** Rápida
* **Controle de umidade:** Sim
* **Respirabilidade:** Boa
* **Resistência:** Adequada para treinamento esportivo de alta intensidade
* **Costuras:** Reforçadas nas principais áreas de tensão
* **Acabamento:** Desenvolvido para reduzir atrito durante o uso
* **Personalização:** DTF (Direct to Film)
* **Aplicação:** Jiu-Jitsu, No-Gi, Grappling, MMA, Wrestling, Muay Thai, treinamento funcional e atividades esportivas em geral
* **Construção:** Desenvolvida para proporcionar conforto, mobilidade e ajuste durante a prática esportiva
* **Linha:** AMT Fight Wear Basic';
BEGIN
    -- 1. Criar categoria se não existir
    INSERT INTO public.store_categories (name, slug, description)
    VALUES ('Rashguard básica infantil', 'rashguard-basica-infantil', 'Rashguards de alta performance para o público infantil.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO new_cat_id;

    -- 2. Criar produto
    INSERT INTO public.products (
        category_id, name, slug, description, short_description, 
        price, stock, sku, image_url, ncm, cfop_internal
    )
    VALUES (
        new_cat_id, 
        'Rashguard Infantil Manga Curta Básica AMT Fight Wear', 
        'rashguard-infantil-manga-curta-basica-amt', 
        desc_text, 
        'Rashguard de alta performance para treinos intensos e competições.',
        79.90, 
        300, 
        'RG-INF-MC-BASIC', 
        '/__l5e/assets-v1/31420c8b-9884-4ec1-ab8e-bc11ad97beff/rashguard-infantil-verde.png',
        '6109.90.00',
        '5101'
    )
    RETURNING id INTO new_prod_id;

    -- 3. Criar imagens da galeria
    INSERT INTO public.store_product_images (product_id, url, alt, sort_order)
    VALUES
      (new_prod_id, '/__l5e/assets-v1/31420c8b-9884-4ec1-ab8e-bc11ad97beff/rashguard-infantil-verde.png', 'Rashguard Infantil Verde', 0),
      (new_prod_id, '/__l5e/assets-v1/c9ca6dc7-f2c0-4a26-9792-9ee7b35a0d22/rashguard-infantil-laranja.png', 'Rashguard Infantil Laranja', 1),
      (new_prod_id, '/__l5e/assets-v1/b0ded094-ddfd-4453-83c9-7538289529c7/rashguard-infantil-amarela.png', 'Rashguard Infantil Amarela', 2),
      (new_prod_id, '/__l5e/assets-v1/78a7e097-e8a0-48f9-9a95-a11acc46d56f/rashguard-infantil-cinza.png', 'Rashguard Infantil Cinza', 3);

    -- 4. Criar variantes (6 tamanhos x 5 cores)
    INSERT INTO public.store_product_variants (product_id, size, color, stock, price)
    SELECT new_prod_id, s, c, 10, 79.90
    FROM 
        (SELECT unnest(ARRAY['6', '8', '10', '12', '14', '16']) as s) sizes,
        (SELECT unnest(ARRAY['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde']) as c) colors;
END $$;
