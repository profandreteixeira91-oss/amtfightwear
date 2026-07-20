-- FASE 1: Escalas & Substituições de Professores

-- 1) Adicionar colunas de substituição em dojo_class_occurrences
ALTER TABLE public.dojo_class_occurrences
  ADD COLUMN IF NOT EXISTS original_teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substitute_teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substitute_reason text,
  ADD COLUMN IF NOT EXISTS substitute_reason_detail text,
  ADD COLUMN IF NOT EXISTS substituted_at timestamptz,
  ADD COLUMN IF NOT EXISTS substituted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dojo_occ_substitute ON public.dojo_class_occurrences(substitute_teacher_id)
  WHERE substitute_teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dojo_occ_owner_date ON public.dojo_class_occurrences(owner_id, occurrence_date);

-- 2) Histórico permanente de substituições
CREATE TABLE public.dojo_team_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  substitute_teacher_id uuid REFERENCES public.dojo_team_members(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.dojo_classes(id) ON DELETE SET NULL,
  occurrence_id uuid REFERENCES public.dojo_class_occurrences(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'occurrence' CHECK (scope IN ('occurrence','period')),
  period_start date,
  period_end date,
  reason text NOT NULL CHECK (reason IN ('ferias','licenca','evento','competicao','afastamento','emergencia','outro')),
  reason_detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_substitutions TO authenticated;
GRANT ALL ON public.dojo_team_substitutions TO service_role;

ALTER TABLE public.dojo_team_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages dojo_team_substitutions"
  ON public.dojo_team_substitutions
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_team_subs_owner ON public.dojo_team_substitutions(owner_id, created_at DESC);
CREATE INDEX idx_team_subs_original ON public.dojo_team_substitutions(original_teacher_id);
CREATE INDEX idx_team_subs_substitute ON public.dojo_team_substitutions(substitute_teacher_id);
CREATE INDEX idx_team_subs_occurrence ON public.dojo_team_substitutions(occurrence_id);

CREATE TRIGGER trg_team_subs_updated_at
  BEFORE UPDATE ON public.dojo_team_substitutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) View consolidada de escala (agenda + substituição + membro)
CREATE OR REPLACE VIEW public.dojo_team_schedule_view
WITH (security_invoker = true)
AS
SELECT
  occ.id                         AS occurrence_id,
  occ.owner_id,
  occ.class_id,
  occ.schedule_id,
  occ.occurrence_date,
  COALESCE(occ.start_time, sch.start_time) AS start_time,
  COALESCE(occ.end_time,   sch.end_time)   AS end_time,
  occ.status,
  occ.cancel_reason,
  cls.name                       AS class_name,
  cls.modality,
  cls.level,
  cls.color,
  cls.unit_id,
  cls.space_id,
  cls.max_students,
  cls.teacher_id                 AS class_teacher_id,
  occ.substitute_teacher_id,
  occ.original_teacher_id,
  occ.substitute_reason,
  occ.substituted_at,
  -- Professor efetivo: substituto se houver, senão titular
  COALESCE(occ.substitute_teacher_id, occ.original_teacher_id) AS effective_teacher_id
FROM public.dojo_class_occurrences occ
JOIN public.dojo_classes cls ON cls.id = occ.class_id
LEFT JOIN public.dojo_class_schedules sch ON sch.id = occ.schedule_id;

GRANT SELECT ON public.dojo_team_schedule_view TO authenticated;