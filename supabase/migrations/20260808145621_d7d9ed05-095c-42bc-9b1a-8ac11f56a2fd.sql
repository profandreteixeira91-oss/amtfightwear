UPDATE public.products
SET description = '## CARACTERÍSTICAS TÉCNICAS

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
* **Linha:** AMT Fight Wear Basic'
WHERE category_id IN (
  SELECT id FROM public.store_categories 
  WHERE slug IN ('rashguards', 'rashguard-basica-adulto') 
  OR name ILIKE '%Rashguard%Basica%'
);
