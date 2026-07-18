
-- ============= Evaluations module rebuild =============

-- Extend existing dojo_evaluations (now serves as "templates"/models)
ALTER TABLE public.dojo_evaluations
  ADD COLUMN IF NOT EXISTS modality text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS min_training_months integer,
  ADD COLUMN IF NOT EXISTS min_attendance integer,
  ADD COLUMN IF NOT EXISTS observations text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES public.dojo_evaluations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_library boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'numeric',
  ADD COLUMN IF NOT EXISTS scale jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS structure jsonb NOT NULL DEFAULT '{"categories":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS end_belt_id uuid REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_graduate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.dojo_units(id) ON DELETE SET NULL;

-- Library templates have NULL owner. Adjust FK to allow NULL owner for library rows.
ALTER TABLE public.dojo_evaluations ALTER COLUMN owner_id DROP NOT NULL;

-- Update RLS to permit library templates readable by all authenticated users
DROP POLICY IF EXISTS "Owner manages evaluations" ON public.dojo_evaluations;
CREATE POLICY "Read own or library evaluations"
  ON public.dojo_evaluations FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR is_library = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Insert own evaluations"
  ON public.dojo_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Update own evaluations"
  ON public.dojo_evaluations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Delete own evaluations"
  ON public.dojo_evaluations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Technique categories
CREATE TABLE IF NOT EXISTS public.dojo_eval_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  order_index integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_eval_categories TO authenticated;
GRANT ALL ON public.dojo_eval_categories TO service_role;
ALTER TABLE public.dojo_eval_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages eval categories"
  ON public.dojo_eval_categories FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_updated_at_eval_cat BEFORE UPDATE ON public.dojo_eval_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dojo_eval_cat_owner ON public.dojo_eval_categories(owner_id);

-- Technique library
CREATE TABLE IF NOT EXISTS public.dojo_eval_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.dojo_eval_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  image_url text,
  video_id uuid REFERENCES public.dojo_videos(id) ON DELETE SET NULL,
  default_score numeric NOT NULL DEFAULT 10,
  required boolean NOT NULL DEFAULT false,
  estimated_seconds integer,
  tags text[] NOT NULL DEFAULT '{}',
  observations text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_eval_techniques TO authenticated;
GRANT ALL ON public.dojo_eval_techniques TO service_role;
ALTER TABLE public.dojo_eval_techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages eval techniques"
  ON public.dojo_eval_techniques FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_updated_at_eval_tech BEFORE UPDATE ON public.dojo_eval_techniques
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dojo_eval_tech_owner ON public.dojo_eval_techniques(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_eval_tech_cat ON public.dojo_eval_techniques(category_id);

-- Evaluation sessions (student evaluations)
CREATE TABLE IF NOT EXISTS public.dojo_eval_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.dojo_evaluations(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  evaluator_id uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'draft', -- draft|scheduled|in_progress|done|failed|review
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  observations text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  result text, -- approved|failed|review|conditional
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_eval_sessions TO authenticated;
GRANT ALL ON public.dojo_eval_sessions TO service_role;
ALTER TABLE public.dojo_eval_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages eval sessions"
  ON public.dojo_eval_sessions FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_updated_at_eval_sess BEFORE UPDATE ON public.dojo_eval_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dojo_eval_sess_owner ON public.dojo_eval_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_eval_sess_student ON public.dojo_eval_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_dojo_eval_sess_status ON public.dojo_eval_sessions(status);

-- Evolution plans
CREATE TABLE IF NOT EXISTS public.dojo_eval_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.dojo_eval_sessions(id) ON DELETE CASCADE,
  strong_points text,
  improvement_points text,
  recommended_techniques uuid[] NOT NULL DEFAULT '{}',
  recommended_videos uuid[] NOT NULL DEFAULT '{}',
  comments text,
  next_evaluation_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_eval_plans TO authenticated;
GRANT ALL ON public.dojo_eval_plans TO service_role;
ALTER TABLE public.dojo_eval_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages eval plans"
  ON public.dojo_eval_plans FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_updated_at_eval_plan BEFORE UPDATE ON public.dojo_eval_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dojo_eval_plan_session ON public.dojo_eval_plans(session_id);

-- Seed library templates (owner_id NULL, is_library true)
INSERT INTO public.dojo_evaluations (owner_id, title, description, modality, is_library, method, structure, active, items)
VALUES
  (NULL, 'Jiu-Jitsu Infantil — Faixa Branca', 'Modelo pronto de avaliação para faixa branca infantil', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Cinza e Branca', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Cinza', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Cinza e Preta', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Amarela e Branca', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Amarela', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Amarela e Preta', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Laranja e Branca', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Laranja', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Laranja e Preta', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Verde e Branca', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Verde', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Infantil — Verde e Preta', 'Modelo pronto', 'jiu-jitsu-infantil', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Adulto — Faixa Branca', 'Modelo pronto - fundamentos e sobrevivência', 'jiu-jitsu-adulto', true, 'numeric',
    '{"categories":[
      {"id":"c1","name":"Fundamentos","weight":1,"criteria":[
        {"id":"cr1","name":"Postura de base","weight":1,"max_score":10,"min_score":0,"required":true,"eliminatory":false,"techniques":[]},
        {"id":"cr2","name":"Quedas básicas (ukemi)","weight":1,"max_score":10,"min_score":0,"required":true,"eliminatory":false,"techniques":[]}
      ]},
      {"id":"c2","name":"Guarda","weight":1,"criteria":[
        {"id":"cr3","name":"Guarda fechada","weight":1,"max_score":10,"min_score":0,"required":true,"eliminatory":false,"techniques":[]}
      ]},
      {"id":"c3","name":"Finalizações","weight":1,"criteria":[
        {"id":"cr4","name":"Estrangulamento pela guarda","weight":1,"max_score":10,"min_score":0,"required":false,"eliminatory":false,"techniques":[]},
        {"id":"cr5","name":"Chave de braço pela guarda","weight":1,"max_score":10,"min_score":0,"required":true,"eliminatory":false,"techniques":[]}
      ]}
    ]}'::jsonb, true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Adulto — Faixa Azul', 'Modelo pronto', 'jiu-jitsu-adulto', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Adulto — Faixa Roxa', 'Modelo pronto', 'jiu-jitsu-adulto', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Adulto — Faixa Marrom', 'Modelo pronto', 'jiu-jitsu-adulto', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Jiu-Jitsu Adulto — Faixa Preta', 'Modelo pronto', 'jiu-jitsu-adulto', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Branca', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Cinza', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Azul', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Amarela', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Laranja', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Verde', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Roxa', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Marrom', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Judô — Faixa Preta', 'Modelo pronto', 'judo', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb),
  (NULL, 'Modelo Genérico Vazio', 'Modelo em branco para construir do zero', 'geral', true, 'numeric', '{"categories":[]}', true, '[]'::jsonb)
ON CONFLICT DO NOTHING;
