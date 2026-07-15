
INSERT INTO public.custom_shop_patch_slots (template_id, variant_key, key, label, x_pct, y_pct, w_pct, h_pct, sort_order, rotation_deg)
SELECT t.id, 'default', 'bordado_1', 'Bordado 1', 20.00, 50.00, 15.00, 7.00, 2, 0
FROM public.custom_shop_templates t WHERE t.kind = 'faixa'
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_shop_patch_slots (template_id, variant_key, key, label, x_pct, y_pct, w_pct, h_pct, sort_order, rotation_deg)
SELECT t.id, 'default', 'bordado_2', 'Bordado 2', 45.00, 50.00, 15.00, 7.00, 3, 0
FROM public.custom_shop_templates t WHERE t.kind = 'faixa'
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_shop_patch_slots (template_id, variant_key, key, label, x_pct, y_pct, w_pct, h_pct, sort_order, rotation_deg)
SELECT t.id, 'default', 'etiqueta', 'Etiqueta', 82.00, 50.00, 12.00, 10.00, 4, 0
FROM public.custom_shop_templates t WHERE t.kind = 'faixa'
ON CONFLICT DO NOTHING;
