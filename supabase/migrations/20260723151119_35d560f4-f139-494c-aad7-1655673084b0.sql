
-- 1) Promote profandreteixeira91's belts to GLOBAL (owner_id NULL)
UPDATE public.dojo_belts
SET owner_id = NULL
WHERE owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c';

-- 2) Remap students still pointing at other owners' local belts to the matching global belt by (name, modality)
UPDATE public.dojo_students s
SET current_belt_id = gb.id
FROM public.dojo_belts lb
JOIN public.dojo_belts gb
  ON gb.owner_id IS NULL
 AND lower(gb.name) = lower(lb.name)
 AND coalesce(lower(gb.modality),'') = coalesce(lower(lb.modality),'')
WHERE s.current_belt_id = lb.id
  AND lb.owner_id IS NOT NULL;

-- 3) Same remap for other referencing tables (safety net)
UPDATE public.dojo_graduations g
SET belt_id = gb.id
FROM public.dojo_belts lb
JOIN public.dojo_belts gb ON gb.owner_id IS NULL AND lower(gb.name)=lower(lb.name) AND coalesce(lower(gb.modality),'')=coalesce(lower(lb.modality),'')
WHERE g.belt_id = lb.id AND lb.owner_id IS NOT NULL;

UPDATE public.dojo_evaluations e
SET belt_id = gb.id
FROM public.dojo_belts lb
JOIN public.dojo_belts gb ON gb.owner_id IS NULL AND lower(gb.name)=lower(lb.name) AND coalesce(lower(gb.modality),'')=coalesce(lower(lb.modality),'')
WHERE e.belt_id = lb.id AND lb.owner_id IS NOT NULL;

UPDATE public.dojo_lesson_plans lp
SET belt_id = gb.id
FROM public.dojo_belts lb
JOIN public.dojo_belts gb ON gb.owner_id IS NULL AND lower(gb.name)=lower(lb.name) AND coalesce(lower(gb.modality),'')=coalesce(lower(lb.modality),'')
WHERE lp.belt_id = lb.id AND lb.owner_id IS NOT NULL;

UPDATE public.dojo_athlete_goals ag
SET target_belt_id = gb.id
FROM public.dojo_belts lb
JOIN public.dojo_belts gb ON gb.owner_id IS NULL AND lower(gb.name)=lower(lb.name) AND coalesce(lower(gb.modality),'')=coalesce(lower(lb.modality),'')
WHERE ag.target_belt_id = lb.id AND lb.owner_id IS NOT NULL;

-- 4) Delete leftover local belts (all users now inherit the global template)
DELETE FROM public.dojo_belts WHERE owner_id IS NOT NULL;
