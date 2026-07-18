
-- Spaces
CREATE TABLE public.dojo_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  capacity integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_spaces TO authenticated;
GRANT ALL ON public.dojo_spaces TO service_role;
ALTER TABLE public.dojo_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages dojo_spaces" ON public.dojo_spaces FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dojo_spaces_updated BEFORE UPDATE ON public.dojo_spaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Classes (turmas)
CREATE TABLE public.dojo_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL,
  space_id uuid REFERENCES public.dojo_spaces(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  teacher_name text,
  name text NOT NULL,
  description text,
  modality text NOT NULL DEFAULT 'jiu-jitsu',
  level text NOT NULL DEFAULT 'todos',
  color text NOT NULL DEFAULT '#dc2626',
  max_students integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_classes TO authenticated;
GRANT ALL ON public.dojo_classes TO service_role;
ALTER TABLE public.dojo_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages dojo_classes" ON public.dojo_classes FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dojo_classes_updated BEFORE UPDATE ON public.dojo_classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_dojo_classes_owner ON public.dojo_classes(owner_id);

-- Weekly schedules
CREATE TABLE public.dojo_class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.dojo_classes(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_order CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_class_schedules TO authenticated;
GRANT ALL ON public.dojo_class_schedules TO service_role;
ALTER TABLE public.dojo_class_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages dojo_class_schedules" ON public.dojo_class_schedules FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_dojo_schedules_class ON public.dojo_class_schedules(class_id);

-- Class students (enrollments)
CREATE TABLE public.dojo_class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.dojo_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_class_students TO authenticated;
GRANT ALL ON public.dojo_class_students TO service_role;
ALTER TABLE public.dojo_class_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages dojo_class_students" ON public.dojo_class_students FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_dojo_class_students_class ON public.dojo_class_students(class_id);

-- Occurrences (specific dates: cancel or override)
CREATE TABLE public.dojo_class_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.dojo_classes(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.dojo_class_schedules(id) ON DELETE SET NULL,
  occurrence_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'scheduled',
  cancel_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, occurrence_date, schedule_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_class_occurrences TO authenticated;
GRANT ALL ON public.dojo_class_occurrences TO service_role;
ALTER TABLE public.dojo_class_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages dojo_class_occurrences" ON public.dojo_class_occurrences FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dojo_occ_updated BEFORE UPDATE ON public.dojo_class_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_dojo_occ_class_date ON public.dojo_class_occurrences(class_id, occurrence_date);
