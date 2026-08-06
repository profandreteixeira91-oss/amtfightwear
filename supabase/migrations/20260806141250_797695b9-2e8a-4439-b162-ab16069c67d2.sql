-- 1. Remover matriculas de planos vinculados às unidades deste dono
DELETE FROM public.dojo_enrollments 
WHERE plan_id IN (
    SELECT id FROM public.dojo_plans 
    WHERE unit_id IN (SELECT id FROM public.dojo_units WHERE owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c')
);

-- 2. Remover planos vinculados às unidades
DELETE FROM public.dojo_plans 
WHERE unit_id IN (SELECT id FROM public.dojo_units WHERE owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c');

-- 3. Remover unidades
DELETE FROM public.dojo_units 
WHERE owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c';