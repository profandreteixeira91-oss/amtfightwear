
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.competition_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  url text,
  enabled boolean NOT NULL DEFAULT true,
  schedule text NOT NULL DEFAULT '6h',
  connector text NOT NULL DEFAULT 'firecrawl',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competition_sources TO authenticated;
GRANT ALL ON public.competition_sources TO service_role;
ALTER TABLE public.competition_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources readable by authenticated" ON public.competition_sources
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_competition_sources_updated BEFORE UPDATE ON public.competition_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.competition_sources(id) ON DELETE SET NULL,
  source_code text,
  external_id text,
  name text NOT NULL,
  organization text,
  organization_logo text,
  description text,
  modality text,
  event_type text,
  scope text,
  tier text,
  country text,
  state text,
  city text,
  address text,
  venue text,
  latitude double precision,
  longitude double precision,
  start_at timestamptz,
  end_at timestamptz,
  registration_deadline timestamptz,
  weigh_in_at timestamptz,
  price numeric(12,2),
  currency text DEFAULT 'BRL',
  official_url text,
  registration_url text,
  contact_email text,
  contact_phone text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  belts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ages jsonb NOT NULL DEFAULT '[]'::jsonb,
  weights jsonb NOT NULL DEFAULT '[]'::jsonb,
  sex text,
  participants_limit integer,
  status text NOT NULL DEFAULT 'scheduled',
  classification jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_code, external_id)
);
GRANT SELECT ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitions readable by authenticated" ON public.competitions
  FOR SELECT TO authenticated USING (true);
CREATE INDEX competitions_start_idx ON public.competitions (start_at);
CREATE INDEX competitions_geo_idx ON public.competitions (country, state, city);
CREATE INDEX competitions_scope_idx ON public.competitions (scope, tier);
CREATE INDEX competitions_org_idx ON public.competitions (organization);
CREATE INDEX competitions_name_trgm ON public.competitions USING gin (name gin_trgm_ops);
CREATE TRIGGER trg_competitions_updated BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.competition_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.competition_sources(id) ON DELETE SET NULL,
  source_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text,
  logs jsonb
);
GRANT SELECT ON public.competition_ingest_runs TO authenticated;
GRANT ALL ON public.competition_ingest_runs TO service_role;
ALTER TABLE public.competition_ingest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs readable by authenticated" ON public.competition_ingest_runs
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.academy_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned',
  professor_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  professor_name text,
  notes text,
  visibility text NOT NULL DEFAULT 'all',
  target_class_ids uuid[] DEFAULT '{}',
  target_belt_ids uuid[] DEFAULT '{}',
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, competition_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competitions TO authenticated;
GRANT ALL ON public.academy_competitions TO service_role;
ALTER TABLE public.academy_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages academy competitions" ON public.academy_competitions
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads academy competitions" ON public.academy_competitions
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id());
CREATE INDEX academy_competitions_owner_idx ON public.academy_competitions (owner_id);
CREATE TRIGGER trg_academy_competitions_updated BEFORE UPDATE ON public.academy_competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.dojo_students(id) ON DELETE CASCADE,
  category text,
  weight_class text,
  weight_kg numeric(6,2),
  belt_id uuid REFERENCES public.dojo_belts(id) ON DELETE SET NULL,
  belt_name text,
  age_group text,
  status text NOT NULL DEFAULT 'interested',
  paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academy_competition_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_athletes TO authenticated;
GRANT ALL ON public.academy_competition_athletes TO service_role;
ALTER TABLE public.academy_competition_athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages athletes" ON public.academy_competition_athletes
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads own athlete row" ON public.academy_competition_athletes
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id() AND student_id = public.get_my_student_id());
CREATE POLICY "student self interest" ON public.academy_competition_athletes
  FOR INSERT TO authenticated WITH CHECK (owner_id = public.get_my_student_owner_id() AND student_id = public.get_my_student_id());
CREATE POLICY "student updates own status" ON public.academy_competition_athletes
  FOR UPDATE TO authenticated USING (owner_id = public.get_my_student_owner_id() AND student_id = public.get_my_student_id())
  WITH CHECK (owner_id = public.get_my_student_owner_id() AND student_id = public.get_my_student_id());
CREATE INDEX aca_athletes_owner_idx ON public.academy_competition_athletes (owner_id, academy_competition_id);
CREATE TRIGGER trg_aca_athletes_updated BEFORE UPDATE ON public.academy_competition_athletes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  role text NOT NULL,
  name text NOT NULL,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_staff TO authenticated;
GRANT ALL ON public.academy_competition_staff TO service_role;
ALTER TABLE public.academy_competition_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages staff" ON public.academy_competition_staff
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads staff" ON public.academy_competition_staff
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id());
CREATE TRIGGER trg_aca_staff_updated BEFORE UPDATE ON public.academy_competition_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'BRL',
  paid_at timestamptz,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_finances TO authenticated;
GRANT ALL ON public.academy_competition_finances TO service_role;
ALTER TABLE public.academy_competition_finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages finances" ON public.academy_competition_finances
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER trg_aca_finances_updated BEFORE UPDATE ON public.academy_competition_finances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  address text,
  phone text,
  price numeric(12,2),
  rooms integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_hotels TO authenticated;
GRANT ALL ON public.academy_competition_hotels TO service_role;
ALTER TABLE public.academy_competition_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages hotels" ON public.academy_competition_hotels
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads hotels" ON public.academy_competition_hotels
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id());
CREATE TRIGGER trg_aca_hotels_updated BEFORE UPDATE ON public.academy_competition_hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  driver text,
  plate text,
  departure_at timestamptz,
  return_at timestamptz,
  seats integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_transport TO authenticated;
GRANT ALL ON public.academy_competition_transport TO service_role;
ALTER TABLE public.academy_competition_transport ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages transport" ON public.academy_competition_transport
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads transport" ON public.academy_competition_transport
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id());
CREATE TRIGGER trg_aca_transport_updated BEFORE UPDATE ON public.academy_competition_transport
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.academy_competition_athletes(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  matches integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  submissions integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  penalties integer NOT NULL DEFAULT 0,
  medal text,
  placement integer,
  category text,
  photos text[] DEFAULT '{}',
  videos text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_results TO authenticated;
GRANT ALL ON public.academy_competition_results TO service_role;
ALTER TABLE public.academy_competition_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages results" ON public.academy_competition_results
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads own results" ON public.academy_competition_results
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id() AND (student_id = public.get_my_student_id() OR student_id IS NULL));
CREATE TRIGGER trg_aca_results_updated BEFORE UPDATE ON public.academy_competition_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_competition_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_competition_id uuid NOT NULL REFERENCES public.academy_competitions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_competition_documents TO authenticated;
GRANT ALL ON public.academy_competition_documents TO service_role;
ALTER TABLE public.academy_competition_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages documents" ON public.academy_competition_documents
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "student reads own documents" ON public.academy_competition_documents
  FOR SELECT TO authenticated USING (owner_id = public.get_my_student_owner_id() AND (student_id = public.get_my_student_id() OR student_id IS NULL));
CREATE POLICY "student uploads own documents" ON public.academy_competition_documents
  FOR INSERT TO authenticated WITH CHECK (owner_id = public.get_my_student_owner_id() AND student_id = public.get_my_student_id());
CREATE TRIGGER trg_aca_docs_updated BEFORE UPDATE ON public.academy_competition_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.competition_sources (code, name, url, connector, enabled, config) VALUES
  ('ibjjf', 'IBJJF', 'https://ibjjf.com/events/calendar', 'firecrawl', true, '{"country":"INT"}'::jsonb),
  ('cbjjf', 'CBJJF', 'https://cbjjf.com.br', 'firecrawl', true, '{"country":"BR"}'::jsonb),
  ('uaejjf', 'UAEJJF / AJP Tour', 'https://ajptour.com/en/events', 'firecrawl', true, '{"country":"INT"}'::jsonb),
  ('sjjif', 'SJJIF', 'https://sjjif.com', 'firecrawl', false, '{"country":"INT"}'::jsonb),
  ('jjif', 'JJIF', 'https://jjif.org', 'firecrawl', false, '{"country":"INT"}'::jsonb),
  ('adcc', 'ADCC', 'https://adcombat.com', 'firecrawl', false, '{"country":"INT"}'::jsonb),
  ('fed-estaduais', 'Federações estaduais (BR)', '', 'firecrawl', false, '{"country":"BR"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
