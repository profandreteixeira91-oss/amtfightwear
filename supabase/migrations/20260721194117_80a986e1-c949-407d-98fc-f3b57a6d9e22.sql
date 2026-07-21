
-- Repoint dojo_classes.teacher_id from dojo_students to dojo_team_members
-- Clean invalid references first (values that are not valid team member ids)
UPDATE public.dojo_classes c
SET teacher_id = NULL
WHERE teacher_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dojo_team_members tm WHERE tm.id = c.teacher_id);

ALTER TABLE public.dojo_classes DROP CONSTRAINT IF EXISTS dojo_classes_teacher_id_fkey;
ALTER TABLE public.dojo_classes
  ADD CONSTRAINT dojo_classes_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.dojo_team_members(id) ON DELETE SET NULL;
