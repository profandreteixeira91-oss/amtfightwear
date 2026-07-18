
-- Enums
DO $$ BEGIN
  CREATE TYPE public.competition_provider AS ENUM (
    'manual','smoothcomp','sou_competidor','bjj_tour','ibjjf','uaejjf','cbjj','cbjje','fjjrio','fpjjb','fjjsp','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.competition_athlete_status AS ENUM (
    'pre_registered','registered','payment_pending','confirmed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Competitions
CREATE TABLE IF NOT EXISTS public.dojo_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.competition_provider NOT NULL DEFAULT 'manual',
  external_id TEXT,
  external_url TEXT,
  name TEXT NOT NULL,
  banner_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  venue_name TEXT,
  address TEXT,
  organizer TEXT,
  description TEXT,
  modality TEXT,
  with_gi BOOLEAN,
  age_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  belts JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  entry_fee NUMERIC(10,2),
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'upcoming',
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_competitions_owner ON public.dojo_competitions(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_competitions_starts ON public.dojo_competitions(starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dojo_competitions_provider_ext ON public.dojo_competitions(owner_id, provider, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competitions TO authenticated;
GRANT ALL ON public.dojo_competitions TO service_role;
ALTER TABLE public.dojo_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages competitions" ON public.dojo_competitions
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Athletes inscribed
CREATE TABLE IF NOT EXISTS public.dojo_competition_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  category TEXT,
  weight NUMERIC(6,2),
  belt TEXT,
  age_group TEXT,
  status public.competition_athlete_status NOT NULL DEFAULT 'pre_registered',
  notes TEXT,
  registered_by UUID REFERENCES auth.users(id),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_dojo_comp_athletes_owner ON public.dojo_competition_athletes(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_comp_athletes_comp ON public.dojo_competition_athletes(competition_id);
CREATE INDEX IF NOT EXISTS idx_dojo_comp_athletes_student ON public.dojo_competition_athletes(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_athletes TO authenticated;
GRANT ALL ON public.dojo_competition_athletes TO service_role;
ALTER TABLE public.dojo_competition_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages comp athletes" ON public.dojo_competition_athletes
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Attachments
CREATE TABLE IF NOT EXISTS public.dojo_competition_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  kind TEXT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dojo_comp_att_comp ON public.dojo_competition_attachments(competition_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_attachments TO authenticated;
GRANT ALL ON public.dojo_competition_attachments TO service_role;
ALTER TABLE public.dojo_competition_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages comp attachments" ON public.dojo_competition_attachments
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Results (future)
CREATE TABLE IF NOT EXISTS public.dojo_competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.dojo_competition_athletes(id) ON DELETE CASCADE,
  placement INTEGER,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_results TO authenticated;
GRANT ALL ON public.dojo_competition_results TO service_role;
ALTER TABLE public.dojo_competition_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages comp results" ON public.dojo_competition_results
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Medals (future)
CREATE TABLE IF NOT EXISTS public.dojo_competition_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.dojo_competitions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.dojo_competition_athletes(id) ON DELETE CASCADE,
  medal TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_competition_medals TO authenticated;
GRANT ALL ON public.dojo_competition_medals TO service_role;
ALTER TABLE public.dojo_competition_medals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages comp medals" ON public.dojo_competition_medals
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- updated_at triggers
CREATE TRIGGER trg_dojo_competitions_updated
  BEFORE UPDATE ON public.dojo_competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_dojo_comp_athletes_updated
  BEFORE UPDATE ON public.dojo_competition_athletes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_dojo_comp_results_updated
  BEFORE UPDATE ON public.dojo_competition_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
